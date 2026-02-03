/**
 * CoSparkAI 智能布局管理器
 * 确保积木生成在可见的合适位置
 */

export class LayoutManager {
  /**
   * 构造函数
   */
  constructor() {
    this.gridSize = 50; // 网格大小（像素）
    this.blockSpacing = 80; // 积木间距
    this.safeMargin = 150; // 安全边距（避免被菜单遮挡）
  }
  
  /**
   * 计算新积木的最佳位置
   * @param {Object} workspace - Blockly工作区
   * @param {Object} newBlock - 新积木（可选）
   * @returns {{x: number, y: number}} 目标位置
   */
  calculateBestPosition(workspace, newBlock = null) {
    if (!workspace) {
      return { x: 300, y: 200 }; // 默认位置
    }
    
    const metrics = workspace.getMetrics();
    const topBlocks = workspace.getTopBlocks(false);
    
    // 如果工作区为空，放在中心区域
    if (topBlocks.length === 0) {
      return this._getCenterPosition(metrics);
    }
    
    // 分析现有积木布局
    const layoutAnalysis = this._analyzeLayout(workspace, topBlocks);
    
    // 策略1：如果有明显空白区域，放在空白处
    const emptySpot = this._findEmptySpot(workspace, layoutAnalysis);
    if (emptySpot) {
      return emptySpot;
    }
    
    // 策略2：放在最下方积木的下方
    const belowPosition = this._getPositionBelowLastBlock(layoutAnalysis);
    if (belowPosition) {
      return belowPosition;
    }
    
    // 策略3：放在工作区右侧（新列）
    return this._getNewColumnPosition(metrics, layoutAnalysis);
  }
  
  /**
   * 获取中心位置
   * @param {Object} metrics - 工作区指标
   * @returns {{x: number, y: number}} 中心位置
   */
  _getCenterPosition(metrics) {
    return {
      x: Math.max(metrics.viewLeft + this.safeMargin, 350),
      y: Math.max(metrics.viewTop + 100, 150)
    };
  }
  
  /**
   * 分析现有布局
   * @param {Object} workspace - 工作区
   * @param {Array} topBlocks - 顶层积木
   * @returns {Object} 布局分析结果
   */
  _analyzeLayout(workspace, topBlocks) {
    const analysis = {
      blocks: [],
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      grid: {}
    };
    
    topBlocks.forEach(block => {
      try {
        const pos = block.getRelativeToSurfaceXY();
        const size = this._estimateBlockSize(block);
        
        analysis.blocks.push({
          block,
          x: pos.x,
          y: pos.y,
          width: size.width,
          height: size.height
        });
        
        analysis.minX = Math.min(analysis.minX, pos.x);
        analysis.maxX = Math.max(analysis.maxX, pos.x + size.width);
        analysis.minY = Math.min(analysis.minY, pos.y);
        analysis.maxY = Math.max(analysis.maxY, pos.y + size.height);
        
        // 填充网格
        this._fillGrid(analysis.grid, pos.x, pos.y, size.width, size.height);
      } catch (error) {
        console.warn('分析积木布局失败:', error);
      }
    });
    
    return analysis;
  }
  
  /**
   * 估算积木尺寸
   * @param {Object} block - Blockly积木
   * @returns {{width: number, height: number}} 估算尺寸
   */
  _estimateBlockSize(block) {
    // 根据积木类型估算尺寸
    const type = block.type || '';
    
    // 简单估算逻辑
    if (type.includes('control_repeat') || type.includes('control_if')) {
      return { width: 120, height: 100 };
    }
    
    if (type.includes('looks_say') || type.includes('looks_think')) {
      return { width: 150, height: 60 };
    }
    
    if (type.includes('motion_')) {
      return { width: 120, height: 60 };
    }
    
    // 默认尺寸
    return { width: 100, height: 60 };
  }
  
  /**
   * 填充网格
   * @param {Object} grid - 网格对象
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  _fillGrid(grid, x, y, width, height) {
    const startGridX = Math.floor(x / this.gridSize);
    const startGridY = Math.floor(y / this.gridSize);
    const endGridX = Math.floor((x + width) / this.gridSize);
    const endGridY = Math.floor((y + height) / this.gridSize);
    
    for (let gx = startGridX; gx <= endGridX; gx++) {
      for (let gy = startGridY; gy <= endGridY; gy++) {
        const key = `${gx},${gy}`;
        grid[key] = true;
      }
    }
  }
  
  /**
   * 查找空白区域
   * @param {Object} workspace - 工作区
   * @param {Object} analysis - 布局分析
   * @returns {{x: number, y: number}|null} 空白位置或null
   */
  _findEmptySpot(workspace, analysis) {
    const metrics = workspace.getMetrics();
    const viewStartX = Math.floor(metrics.viewLeft / this.gridSize);
    const viewStartY = Math.floor(metrics.viewTop / this.gridSize);
    const viewEndX = Math.floor((metrics.viewLeft + metrics.viewWidth) / this.gridSize);
    const viewEndY = Math.floor((metrics.viewTop + metrics.viewHeight) / this.gridSize);
    
    // 搜索视图区域内的网格
    for (let gx = viewStartX; gx <= viewEndX; gx++) {
      for (let gy = viewStartY; gy <= viewEndY; gy++) {
        const key = `${gx},${gy}`;
        
        // 如果网格是空的，检查周围区域
        if (!analysis.grid[key]) {
          // 检查3x3区域是否都是空的（确保有足够空间）
          let hasSpace = true;
          for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
              const neighborKey = `${gx + dx},${gy + dy}`;
              if (analysis.grid[neighborKey]) {
                hasSpace = false;
                break;
              }
            }
            if (!hasSpace) break;
          }
          
          if (hasSpace) {
            return {
              x: gx * this.gridSize + this.safeMargin,
              y: gy * this.gridSize + 50
            };
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * 获取最后一个积木下方的位置
   * @param {Object} analysis - 布局分析
   * @returns {{x: number, y: number}|null} 位置
   */
  _getPositionBelowLastBlock(analysis) {
    if (analysis.blocks.length === 0) return null;
    
    // 找到最下方的积木
    let bottomBlock = analysis.blocks[0];
    for (const blockInfo of analysis.blocks) {
      if (blockInfo.y > bottomBlock.y) {
        bottomBlock = blockInfo;
      }
    }
    
    return {
      x: bottomBlock.x,
      y: bottomBlock.y + bottomBlock.height + this.blockSpacing
    };
  }
  
  /**
   * 获取新列位置
   * @param {Object} metrics - 工作区指标
   * @param {Object} analysis - 布局分析
   * @returns {{x: number, y: number}} 新列位置
   */
  _getNewColumnPosition(metrics, analysis) {
    const newColumnX = Math.max(analysis.maxX + this.blockSpacing, metrics.viewLeft + this.safeMargin);
    const newColumnY = Math.max(analysis.minY, metrics.viewTop + 100);
    
    return {
      x: newColumnX,
      y: newColumnY
    };
  }
  
  /**
   * 自动滚动到积木位置
   * @param {Object} workspace - Blockly工作区
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  scrollToPosition(workspace, x, y) {
    if (!workspace || !workspace.scrollbar) return;
    
    try {
      const metrics = workspace.getMetrics();
      
      // 计算目标滚动位置（让积木在视图中心）
      const targetScrollX = x - metrics.viewWidth / 2;
      const targetScrollY = y - metrics.viewHeight / 2;
      
      // 平滑滚动
      if (workspace.scrollbar.hScroll && typeof workspace.scrollbar.hScroll.set === 'function') {
        workspace.scrollbar.hScroll.set(targetScrollX);
      }
      
      if (workspace.scrollbar.vScroll && typeof workspace.scrollbar.vScroll.set === 'function') {
        workspace.scrollbar.vScroll.set(targetScrollY);
      }
    } catch (error) {
      console.warn('滚动到位置失败:', error);
    }
  }
  
  /**
   * 整理工作区布局
   * @param {Object} workspace - Blockly工作区
   */
  arrangeWorkspace(workspace) {
    if (!workspace || typeof workspace.cleanUp !== 'function') return;
    
    try {
      // 使用Blockly自带的整理功能
      workspace.cleanUp();
      
      // 强制SVG重绘
      if (window.Blockly && window.Blockly.svgResize) {
        window.Blockly.svgResize(workspace);
      }
    } catch (error) {
      console.warn('整理工作区失败:', error);
    }
  }
}