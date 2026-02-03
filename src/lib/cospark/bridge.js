/**
 * CoSparkAI 生产级全局桥接器
 * 核心通信层，处理AI与Scratch的双向交互
 */

import BlockAdapter from './block-adapter.js';
import { SecurityValidator } from './security-validator.js';
import { VariableManager } from './variable-manager.js';
import { LayoutManager } from './layout-manager.js';

class CoSparkBridge {
  /**
   * 构造函数
   */
  constructor() {
    this._vm = null;
    this._isInitialized = false;
    this._variableManager = null;
    this._layoutManager = null;
    this._lastOperationId = 0;
    this._operationHistory = [];
    
    // 生产环境配置
    this.config = {
      maxBlocksPerOperation: 50,
      maxTotalBlocks: 500,
      enableLogging: true,
      autoScroll: true,
      autoArrange: true,
      enableSound: true
    };
  }
  
  /**
   * 初始化桥接器
   * @param {Object} vm - Scratch VM实例
   * @returns {Object} 初始化结果
   */
  init(vm) {
    if (this._isInitialized) {
      console.warn('CoSparkBridge: 已经初始化过');
      return { success: true, message: 'Already initialized' };
    }
    
    if (!vm) {
      console.error('CoSparkBridge: 需要有效的VM实例');
      return { success: false, error: 'VM instance required' };
    }
    
    if (!window.Blockly) {
      console.error('CoSparkBridge: Blockly未加载');
      return { success: false, error: 'Blockly not loaded' };
    }
    
    try {
      // 保存VM引用
      this._vm = vm;
      
      // 初始化管理器
      this._variableManager = new VariableManager(vm);
      this._layoutManager = new LayoutManager();
      
      // 初始化变量管理器
      this._variableManager.initialize();
      
      // 创建全局接口
      this._createGlobalInterface();
      
      // 标记为已初始化
      this._isInitialized = true;
      
      // 触发就绪事件
      this._emitReadyEvent();
      
      console.log('🚀 CoSparkBridge: 生产环境桥接器已就绪');
      
      return {
        success: true,
        version: '1.0.0',
        timestamp: Date.now(),
        features: ['generate', 'getContext', 'validate', 'stats']
      };
      
    } catch (error) {
      console.error('CoSparkBridge: 初始化失败:', error);
      return {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      };
    }
  }
  
  /**
   * 创建全局接口
   */
  _createGlobalInterface() {
    window.CoSparkAI = {
      // 核心功能
      generate: this.generateCode.bind(this),
      getContext: this.getContext.bind(this),
      importImage: this.importImage.bind(this),  // ← 新增这一行
      switchToSprite: this.switchToSprite.bind(this),// ← 新增这一行,切换角色
      getAllSprites: this.getAllSprites.bind(this),// ← 新增这一行,获取所有角色
      // 工具功能
      validate: this.validateAIJson.bind(this),
      stats: this.getStatistics.bind(this),
      
      // 系统信息
      version: '1.0.0',
      initialized: true,
      environment: process.env.NODE_ENV || 'development',
      
      // 调试功能（仅开发环境）
      ...(this.config.enableLogging && {
        debug: this._getDebugInfo.bind(this),
        history: this._getOperationHistory.bind(this)
      })
    };
  }
  
  /**
   * 触发就绪事件
   */
  _emitReadyEvent() {
    try {
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('CoSparkReady', {
          detail: {
            version: '1.0.0',
            timestamp: Date.now(),
            vmReady: !!this._vm,
            blocklyReady: !!window.Blockly
          }
        }));
      }
    } catch (error) {
      console.warn('CoSparkBridge: 触发就绪事件失败:', error);
    }
  }
  
  /**
   * 生成新积木（主入口）
   * @param {Object} aiJson - AI生成的JSON
   * @returns {Object} 生成结果
   */
  async generateCode(aiJson) {
    const operationId = ++this._lastOperationId;
    const startTime = performance.now();
    
    // 记录操作开始
    this._logOperation('start', operationId, { aiJson });
    
    // 基本验证
    if (!this._isInitialized) {
      return this._errorResponse('Bridge not initialized', operationId);
    }
    
    if (!window.Blockly) {
      return this._errorResponse('Blockly not available', operationId);
    }
    
    const workspace = window.Blockly.getMainWorkspace();
    if (!workspace) {
      return this._errorResponse('Workspace not available', operationId);
    }
    
    try {
      // 步骤1: 安全验证
      const validation = SecurityValidator.validateAIJson(aiJson);
      if (!validation.valid) {
        console.error('CoSparkBridge: AI JSON验证失败:', validation.errors);
        return this._errorResponse(`Validation failed: ${validation.errors.join(', ')}`, operationId);
      }
      
      // 步骤2: 检查积木数量限制
      const blockCount = BlockAdapter.countBlocks(aiJson);
      if (blockCount > this.config.maxBlocksPerOperation) {
        return this._errorResponse(
          `Block count exceeds limit: ${blockCount} > ${this.config.maxBlocksPerOperation}`,
          operationId
        );
      }
      
      // 步骤3: 清理和规范化JSON
      const sanitizedJson = SecurityValidator.sanitizeAIJson(aiJson);
      
      // 步骤4: 预处理变量（如果需要）
      this._variableManager.preprocessVariables(sanitizedJson);
      
      // 步骤5: 计算最佳位置
      const targetPosition = this._layoutManager.calculateBestPosition(workspace);
      
      // 步骤6: 生成XML并设置坐标
      const xmlString = BlockAdapter.jsonToXml(sanitizedJson);
      const dom = window.Blockly.Xml.textToDom(xmlString);
      
      // 设置坐标（找到第一个block元素）
      const firstBlock = dom.querySelector('block');
      if (firstBlock) {
        firstBlock.setAttribute('x', targetPosition.x);
        firstBlock.setAttribute('y', targetPosition.y);
      }
      
      // 步骤7: 注入积木到工作区
      const newBlockIds = window.Blockly.Xml.domToWorkspace(dom, workspace);
      
      // 步骤8: 自动滚动到新积木位置
      if (this.config.autoScroll && newBlockIds.length > 0) {
        this._layoutManager.scrollToPosition(workspace, targetPosition.x, targetPosition.y);
      }
      
      // 步骤9: 播放音效
      if (this.config.enableSound && workspace.getAudioManager) {
        try {
          workspace.getAudioManager().play('click');
        } catch (audioError) {
          // 忽略音效错误
        }
      }
      
      // 步骤10: 整理工作区布局
      if (this.config.autoArrange) {
        setTimeout(() => {
          this._layoutManager.arrangeWorkspace(workspace);
        }, 100);
      }
      
      // 步骤11: 通知VM更新
      this._syncWithVM();
      
      // 计算执行时间
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 记录操作完成
      this._logOperation('complete', operationId, {
        success: true,
        blockCount: newBlockIds.length,
        duration,
        position: targetPosition
      });
      
      // 返回成功结果
      return {
        success: true,
        operationId,
        blockIds: newBlockIds,
        count: newBlockIds.length,
        position: targetPosition,
        duration: Math.round(duration),
        timestamp: Date.now(),
        warnings: validation.warnings
      };
      
    } catch (error) {
      // 错误处理
      console.error('CoSparkBridge: 生成积木失败:', error);
      
      // 记录操作失败
      this._logOperation('error', operationId, {
        error: error.message,
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
      
      return this._errorResponse(error.message, operationId, error);
    }
  }
  
  /**
   * 获取当前上下文
   * @returns {Object} 上下文信息
   */
  getContext() {
    if (!this._isInitialized || !this._vm || !this._vm.editingTarget) {
      return { error: 'Bridge not ready', success: false };
    }
    
    try {
      const workspace = window.Blockly.getMainWorkspace();
      if (!workspace) {
        return { error: 'Workspace not found', success: false };
      }
      
      const editingTarget = this._vm.editingTarget;
      
      // 获取积木XML
      const xmlDom = window.Blockly.Xml.workspaceToDom(workspace);
      
      // 清理XML（移除坐标和ID以减少数据量）
      this._cleanXmlDom(xmlDom);
      
      const xmlString = window.Blockly.Xml.domToText(xmlDom);
      const compressedXml = this._compressXml(xmlString);
      
      // 获取变量信息
      const variables = this._variableManager.getAllVariables();
      
      // 获取积木统计
      const allBlocks = workspace.getAllBlocks();
      
      return {
        success: true,
        timestamp: Date.now(),
        
        // 项目信息
        project: {
          sprite: editingTarget.getName(),
          isStage: editingTarget.isStage,
          blockCount: allBlocks.length
        },
        
        // 角色状态
        state: {
          x: editingTarget.x || 0,
          y: editingTarget.y || 0,
          direction: editingTarget.direction || 90,
          size: editingTarget.size || 100,
          visible: editingTarget.visible !== false
        },
        
        // 变量数据
        variables: variables.reduce((acc, variable) => {
          acc[variable.name] = {
            value: variable.value,
            type: variable.type,
            id: variable.id
          };
          return acc;
        }, {}),
        
        // 积木代码
        blocks: {
          xml: compressedXml,
          length: compressedXml.length,
          estimatedTokenCount: Math.ceil(compressedXml.length / 4)
        },
        
        // 系统状态
        system: {
          totalBlocks: allBlocks.length,
          workspaceMetrics: workspace.getMetrics ? workspace.getMetrics() : null,
          vmReady: !!this._vm
        }
      };
      
    } catch (error) {
      console.error('CoSparkBridge: 获取上下文失败:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
  
  /**
   * 验证AI JSON
   * @param {Object} aiJson - 要验证的JSON
   * @returns {Object} 验证结果
   */
  validateAIJson(aiJson) {
    return SecurityValidator.validateAIJson(aiJson);
  }
  
  /**
   * 获取统计信息
   * @returns {Object} 统计信息
   */
  getStatistics() {
    if (!this._isInitialized) {
      return { error: 'Bridge not initialized', success: false };
    }
    
    const workspace = window.Blockly.getMainWorkspace();
    const allBlocks = workspace ? workspace.getAllBlocks() : [];
    const variableStats = this._variableManager ? this._variableManager.getStatistics() : null;
    
    return {
      success: true,
      timestamp: Date.now(),
      
      bridge: {
        initialized: this._isInitialized,
        operationCount: this._operationHistory.length,
        lastOperationId: this._lastOperationId
      },
      
      workspace: {
        totalBlocks: allBlocks.length,
        topBlocks: workspace ? workspace.getTopBlocks(false).length : 0,
        variables: variableStats
      },
      
      performance: {
        averageOperationTime: this._calculateAverageOperationTime(),
        successRate: this._calculateSuccessRate()
      },
      
      config: this.config
    };
  }
  /**
 * CoSparkBridge - 添加获取所有角色名称的功能
 */

/**
 * 【AI -> Scratch】获取所有角色名称（用于调试）
 * @returns {Promise<Object>} 所有角色信息
 */
async getAllSprites() {
    if (!this._vm) return { success: false, error: "VM not ready" };

    try {
        const targets = this._vm.runtime.targets;
        const sprites = [];

        for (const targetId in targets) {
            const target = targets[targetId];
            if (target && target.getName && !target.isStage) {
                sprites.push({
                    name: target.getName(),
                    id: target.id,
                    isStage: target.isStage
                });
            }
        }

        return {
            success: true,
            sprites: sprites,
            count: sprites.length
        };
    } catch (e) {
        console.error("CoSpark Get All Sprites Error:", e);
        return { success: false, error: e.message };
    }
}

  /**
 * CoSparkBridge - 图片注入方案（贴近官方用法版）
 */

/**
 * 【AI -> Scratch】注入图片作为背景或造型
 * @param {string} imageUrl - AI 生成的图片 URL 或 data:image/...;base64,...
 * @param {'backdrop'|'costume'} type - 'backdrop' (背景) 或 'costume' (角色造型)
 * @param {string} name - 图片名称（会显示在造型列表里）
 * @returns {Promise<{success:boolean, assetId?:string, md5ext?:string, error?:string}>}
 */
/**
 * CoSparkBridge - 图片注入方案（贴近官方用法版）
 */

/**
 * 【AI -> Scratch】注入图片作为背景或造型
 * @param {string} imageUrl - AI 生成的图片 URL 或 data:image/...;base64,...
 * @param {'backdrop'|'costume'} type - 'backdrop' (背景) 或 'costume' (角色造型)
 * @param {string} name - 图片名称（会显示在造型列表里）
 * @returns {Promise<{success:boolean, assetId?:string, md5ext?:string, error?:string}>}
 */
/**
 * CoSparkBridge - 修复后的图片注入方案
 */

/**
 * 【AI -> Scratch】注入图片作为背景或造型
 * @param {string} imageUrl - AI 生成的图片 URL 或 Base64
 * @param {'backdrop'|'costume'} type - 'backdrop' (背景) 或 'costume' (角色造型)
 * @param {string} name - 图片名称
 */
async importImage(imageUrl, type = 'backdrop', name = 'AI Art') {
    if (!this._vm) return { success: false, error: "VM not ready" };

    try {
        // 1. 转成 Uint8Array
        const data = await this._fetchImageToUint8Array(imageUrl);

        // 2. 获取 storage / AssetType / DataFormat
        const storage = this._vm.runtime.storage;
        const AssetType = storage.AssetType || storage.AssetType;
        const DataFormat = storage.DataFormat || storage.DataFormat;

        const dataFormat = DataFormat.PNG; // 默认 PNG
        const assetType = AssetType.ImageBitmap;

        // 3. 注册到 storage
        const asset = storage.createAsset(
            assetType,
            dataFormat,
            data,
            null,
            true // 自动生成 md5
        );

        const md5ext = `${asset.assetId}.${dataFormat}`;

        // 4. 构造 costume/backdrop 对象
        const costumeObject = {
            name: name,
            md5: md5ext,
            assetId: asset.assetId,
            asset: asset,
            dataFormat: dataFormat,
            // 修复：根据图片尺寸动态设置 bitmapResolution
            bitmapResolution: await this._getOptimalBitmapResolution(data),
            // 修复：设置正确的旋转中心（舞台背景的中心）
            rotationCenterX: 240,
            rotationCenterY: 180
        };

        // 5. 注入到目标
        await this._injectCostumeToTarget(costumeObject, md5ext, type);

        return {
            success: true,
            assetId: asset.assetId,
            md5ext
        };
    } catch (e) {
        console.error("CoSpark Image Import Error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * 内部：把 costume/backdrop 注入到舞台或角色
 */
async _injectCostumeToTarget(costumeObject, md5ext, type) {
    const stage = this._vm.runtime.getTargetForStage();
    const editingTarget = this._vm.editingTarget;

    if (type === 'backdrop') {
        // 修复：舞台使用 backdrops，而不是 costumes
        // addBackdrop 的正确调用方式
        await this._vm.addBackdrop(md5ext, costumeObject);

        // 修复：舞台背景的切换方法
        // 舞台使用 backdrops 数组，而不是 costumes
        if (stage && stage.backdrops && stage.backdrops.length > 0) {
            stage.setBackdrop(stage.backdrops.length - 1);
        }
    } else {
        // 角色造型
        if (editingTarget && !editingTarget.isStage) {
            await this._vm.addCostume(editingTarget.id, md5ext, costumeObject);
            editingTarget.setCostume(editingTarget.costumes.length - 1);
        } else {
            console.warn("当前选中是舞台，无法添加角色造型");
        }
    }

    // 6. 通知 UI 刷新
    this._vm.emitTargetsUpdate();
    this._vm.runtime.requestRedraw();
}

/**
 * 内部：根据图片尺寸计算最优的 bitmapResolution
 */
async _getOptimalBitmapResolution(dataUint8Array) {
    return new Promise((resolve) => {
        const blob = new Blob([dataUint8Array]);
        const url = URL.createObjectURL(blob);
        const img = new Image();
        
        img.onload = () => {
            URL.revokeObjectURL(url);
            // Scratch 舞台标准尺寸是 480x360
            // 如果图片宽度 > 480，使用 2x 分辨率；否则使用 1x
            resolve(img.width > 480 ? 2 : 1);
        };
        
        img.onerror = () => {
            URL.revokeObjectURL(url);
            // 出错时默认使用 2x（更清晰）
            resolve(2);
        };
        
        img.src = url;
    });
}

/**
 * 内部：把 URL 或 Base64 图片转成 Uint8Array
 */
async _fetchImageToUint8Array(imageUrl) {
    const isBase64 = imageUrl.startsWith('data:');
    const urlToFetch = isBase64 ? imageUrl : this._ensureProxyIfNeeded(imageUrl);

    const response = await fetch(urlToFetch);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
}

/**
 * 内部：根据环境给外部 URL 加代理
 */
_ensureProxyIfNeeded(url) {
    // 默认不做代理，你可以改成 '/api/assets-proxy?url=' + encodeURIComponent(url);
    return url;
}

/**
 * CoSparkBridge - 添加切换角色功能
 */

/**
 * 【AI -> Scratch】切换当前编辑的角色
 * @param {string} spriteName - 要切换到的角色名称
 * @returns {Promise<Object>} 切换结果
 */
/**
 * 【AI -> Scratch】切换当前编辑的角色
 * @param {string} spriteName - 要切换到的角色名称
 * @returns {Promise<Object>} 切换结果
 */
async switchToSprite(spriteName) {
    if (!this._vm) return { success: false, error: "VM not ready" };

    try {
        const targets = this._vm.runtime.targets;
        let targetToSwitch = null;

        for (const targetId in targets) {
            const target = targets[targetId];
            if (target && target.getName && target.getName() === spriteName) {
                targetToSwitch = target;
                break;
            }
        }

        if (!targetToSwitch) {
            const allSprites = await this.getAllSprites();
            if (allSprites.success && allSprites.sprites.length > 0) {
                const availableNames = allSprites.sprites.map(s => s.name).join(', ');
                return {
                    success: false,
                    error: `未找到名为 "${spriteName}" 的角色。可用角色：${availableNames}`
                };
            } else {
                return { success: false, error: `未找到名为 "${spriteName}" 的角色` };
            }
        }

        // 修复：将 target.id 转换为数字
        const targetIdNumber = parseInt(targetToSwitch.id, 10);
        if (isNaN(targetIdNumber)) {
            return { success: false, error: `角色 ID "${targetToSwitch.id}" 不是有效数字` };
        }

        // 传递数字 ID 给 setEditingTarget
        await this._vm.setEditingTarget(targetIdNumber);
        this._vm.emitTargetsUpdate();
        this._vm.runtime.requestRedraw();

        return {
            success: true,
            spriteName: spriteName,
            spriteId: targetToSwitch.id
        };
    } catch (e) {
        console.error("CoSpark Switch Sprite Error:", e);
        return { success: false, error: e.message };
    }
}



/**
 * 【AI -> Scratch】获取当前编辑的角色名称
 * @returns {Promise<Object>} 当前角色信息
 */
async getCurrentSprite() {
    if (!this._vm || !this._vm.editingTarget) {
        return { success: false, error: "VM not ready" };
    }

    try {
        const editingTarget = this._vm.editingTarget;
        return {
            success: true,
            spriteName: editingTarget.getName(),
            spriteId: editingTarget.id,
            isStage: editingTarget.isStage
        };
    } catch (e) {
        console.error("CoSpark Get Current Sprite Error:", e);
        return { success: false, error: e.message };
    }
}





  
  /**
   * 清理XML DOM
   * @param {Element} dom - XML DOM元素
   */
  _cleanXmlDom(dom) {
    if (!dom || !dom.querySelectorAll) return;
    
    const elements = dom.querySelectorAll('*');
    elements.forEach(element => {
      // 移除坐标和ID属性
      element.removeAttribute('x');
      element.removeAttribute('y');
      element.removeAttribute('id');
      element.removeAttribute('disabled');
    });
  }
  
  /**
   * 压缩XML字符串
   * @param {string} xmlString - 原始XML
   * @returns {string} 压缩后的XML
   */
  _compressXml(xmlString) {
    // 移除换行和多余空格
    return xmlString
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }
  
  /**
   * 同步VM状态
   */
  _syncWithVM() {
    if (!this._vm) return;
    
    try {
      // 延迟执行，确保Blockly已经完成所有更新
      setTimeout(() => {
        if (this._vm.emitWorkspaceUpdate) {
          this._vm.emitWorkspaceUpdate();
        }
        
        if (this._vm.runtime && this._vm.runtime.requestRedraw) {
          this._vm.runtime.requestRedraw();
        }
      }, 50);
    } catch (error) {
      console.warn('CoSparkBridge: VM同步失败:', error);
    }
  }
  
  /**
   * 记录操作日志
   * @param {string} type - 操作类型
   * @param {number} id - 操作ID
   * @param {Object} data - 操作数据
   */
  _logOperation(type, id, data) {
    const logEntry = {
      id,
      type,
      timestamp: Date.now(),
      data
    };
    
    this._operationHistory.push(logEntry);
    
    // 保持历史记录在合理大小
    if (this._operationHistory.length > 100) {
      this._operationHistory = this._operationHistory.slice(-50);
    }
    
    // 生产环境控制台日志
    if (this.config.enableLogging) {
      console.log(`[CoSpark] Operation ${type}:`, logEntry);
    }
  }
  
  /**
   * 错误响应
   * @param {string} message - 错误消息
   * @param {number} operationId - 操作ID
   * @param {Error} error - 原始错误对象
   * @returns {Object} 错误响应
   */
  _errorResponse(message, operationId, error = null) {
    const errorResponse = {
      success: false,
      operationId,
      error: message,
      timestamp: Date.now()
    };
    
    // 开发环境添加堆栈信息
    if (process.env.NODE_ENV !== 'production' && error) {
      errorResponse.stack = error.stack;
    }
    
    return errorResponse;
  }
  
  /**
   * 计算平均操作时间
   * @returns {number} 平均时间（毫秒）
   */
  _calculateAverageOperationTime() {
    const completedOps = this._operationHistory.filter(op => 
      op.type === 'complete' && op.data && op.data.duration
    );
    
    if (completedOps.length === 0) return 0;
    
    const totalDuration = completedOps.reduce((sum, op) => sum + op.data.duration, 0);
    return Math.round(totalDuration / completedOps.length);
  }
  
  /**
   * 计算成功率
   * @returns {number} 成功率（0-1）
   */
  _calculateSuccessRate() {
    const totalOps = this._operationHistory.filter(op => 
      op.type === 'complete' || op.type === 'error'
    );
    
    if (totalOps.length === 0) return 1;
    
    const successfulOps = totalOps.filter(op => op.type === 'complete');
    return successfulOps.length / totalOps.length;
  }
  
  /**
   * 获取调试信息（仅开发环境）
   * @returns {Object} 调试信息
   */
  _getDebugInfo() {
    if (!this.config.enableLogging) {
      return { error: 'Debug mode disabled in production' };
    }
    
    return {
      vm: !!this._vm,
      blockly: !!window.Blockly,
      workspace: !!window.Blockly?.getMainWorkspace(),
      isInitialized: this._isInitialized,
      config: this.config,
      operationHistory: this._operationHistory.slice(-5)
    };
  }
  
  /**
   * 获取操作历史（仅开发环境）
   * @returns {Array} 操作历史
   */
  _getOperationHistory() {
    if (!this.config.enableLogging) {
      return { error: 'History disabled in production' };
    }
    
    return this._operationHistory;
  }
}

// 导出单例实例
export default new CoSparkBridge();