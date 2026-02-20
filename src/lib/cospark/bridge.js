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
    this.allowedOrigins = ['*']; // 默认允许所有，可配置为特定域名数组
    
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
      // ... 原有代码，成功初始化后 ...
      this._setupMessageListener();
      
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
      // 👇 新增方法
      createSprite: this.createSprite.bind(this),
      replaceSpriteImage: this.replaceSpriteImage.bind(this),

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
  /**
 * 生成积木核心方法 - 支持 AI 嵌套格式与官方 SB3 扁平格式
 * @param {Object} aiJson - 输入的积木 JSON
 */
async generateCode(aiJson) {
  const operationId = ++this._lastOperationId;
  const startTime = performance.now();
  
  this._logOperation('start', operationId, { aiJson });
  
  // 1. 基本环境验证
  if (!this._isInitialized) return this._errorResponse('Bridge not initialized', operationId);
  if (!window.Blockly) return this._errorResponse('Blockly not available', operationId);
  
  const workspace = window.Blockly.getMainWorkspace();
  if (!workspace) return this._errorResponse('Workspace not available', operationId);
  
  try {
    // === 核心适配逻辑：将官方标准格式转换为 AI 嵌套格式 ===
    let processingJson = aiJson;
    
    // 如果检测到 targets 数组，说明是官方标准格式
    if (aiJson && Array.isArray(aiJson.targets)) {
      this._logOperation('info', operationId, '检测到官方标准格式，开始转换...');
      
      // 提取第一个非舞台角色的 blocks
      const sprite = aiJson.targets.find(t => !t.isStage);
      if (!sprite || !sprite.blocks) {
        throw new Error('Invalid SB3: No active sprite blocks found');
      }

      // 找到顶层积木 ID (topLevel 为 true 的积木)
      const topBlockId = Object.keys(sprite.blocks).find(id => sprite.blocks[id].topLevel);
      if (!topBlockId) {
        throw new Error('Invalid SB3: No top-level block found');
      }

      // 执行递归转换：从扁平转嵌套
      processingJson = this._transformStandardToNested(sprite.blocks, topBlockId);
    }

    // 2. 安全验证 (此时 processingJson 必须包含 opcode 字段)
    const validation = SecurityValidator.validateAIJson(processingJson);
    if (!validation.valid) {
      console.error('CoSparkBridge: 验证失败:', validation.errors);
      return this._errorResponse(`Validation failed: ${validation.errors.join(', ')}`, operationId);
    }
    
    // 3. 检查积木数量限制
    const blockCount = BlockAdapter.countBlocks(processingJson);
    if (blockCount > this.config.maxBlocksPerOperation) {
      return this._errorResponse(`Block count exceeds limit: ${blockCount}`, operationId);
    }
    
    // 4. 清理、规范化与变量处理
    const sanitizedJson = SecurityValidator.sanitizeAIJson(processingJson);
    this._variableManager.preprocessVariables(sanitizedJson);
    
    // 5. 布局与 XML 生成
    const targetPosition = this._layoutManager.calculateBestPosition(workspace);
    const xmlString = BlockAdapter.jsonToXml(sanitizedJson); // 此时适配器能处理嵌套格式了
    
    const dom = window.Blockly.Xml.textToDom(xmlString);
    const firstBlock = dom.querySelector('block');
    if (firstBlock) {
      firstBlock.setAttribute('x', targetPosition.x);
      firstBlock.setAttribute('y', targetPosition.y);
    }
    
    // 6. 注入工作区
    const newBlockIds = window.Blockly.Xml.domToWorkspace(dom, workspace);
    
    // 7. 后置处理 (滚动、音效、自动整理)
    if (this.config.autoScroll && newBlockIds.length > 0) {
      this._layoutManager.scrollToPosition(workspace, targetPosition.x, targetPosition.y);
    }
    
    if (this.config.enableSound && workspace.getAudioManager) {
      try { workspace.getAudioManager().play('click'); } catch (e) {}
    }
    
    if (this.config.autoArrange) {
      setTimeout(() => this._layoutManager.arrangeWorkspace(workspace), 100);
    }
    
    this._syncWithVM();
    
    const duration = performance.now() - startTime;
    this._logOperation('complete', operationId, { success: true, duration });
    
    return {
      success: true,
      operationId,
      blockIds: newBlockIds,
      count: newBlockIds.length,
      duration: Math.round(duration)
    };
    
  } catch (error) {
    console.error('CoSparkBridge: 生成失败:', error);
    return this._errorResponse(error.message, operationId, error);
  }
}
/**
 * 内部：智能处理输入数据
 * 支持：SVG代码字符串、Data URI、URL
 * 返回：{ data: Uint8Array, format: 'SVG' | 'PNG', width: number, height: number }
 */
async _parseInputData(input) {
  const encoder = new TextEncoder();
  let data;
  let format = 'PNG';
  let width = 100; // 默认宽高
  let height = 100;

  // 1. 判断是否为 SVG 代码字符串
  if (typeof input === 'string' && input.trim().startsWith('<')) {
    format = 'SVG';
    data = encoder.encode(input);
    // 尝试从字符串中提取宽高
    this._extractSvgDimensions(input, (w, h) => { width = w; height = h; });
    return { data, format, width, height };
  }

  // 2. 判断是否为 Data URI
  if (typeof input === 'string' && input.startsWith('data:')) {
    const header = input.substring(5, 20).toLowerCase();
    if (header.includes('svg')) format = 'SVG';
    
    if (format === 'SVG') {
      let svgString = '';
      // 处理 base64 编码的 SVG
      if (header.includes('base64')) {
          const base64Match = input.match(/base64,(.*)/);
          if (base64Match) svgString = atob(base64Match[1]);
      } else {
          // 处理 URL 编码的 SVG (data:image/svg+xml,...)
          const svgStart = input.indexOf('<svg');
          if (svgStart !== -1) svgString = decodeURIComponent(input.substring(svgStart));
      }
      
      if (svgString) {
          data = encoder.encode(svgString);
          this._extractSvgDimensions(svgString, (w, h) => { width = w; height = h; });
          return { data, format, width, height };
      }
    } else {
      // PNG/JPG
      const response = await fetch(input);
      data = new Uint8Array(await response.arrayBuffer());
      return { data, format, width, height };
    }
  }

  // 3. URL
  if (typeof input === 'string') {
    const lowerUrl = input.toLowerCase();
    if (lowerUrl.endsWith('.svg')) format = 'SVG';
    
    const response = await fetch(input);
    if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
    
    if (format === 'SVG') {
        const text = await response.text();
        data = encoder.encode(text);
        this._extractSvgDimensions(text, (w, h) => { width = w; height = h; });
    } else {
        data = new Uint8Array(await response.arrayBuffer());
    }
    return { data, format, width, height };
  }

  throw new Error('Invalid input type');
}

/**
 * 辅助：从 SVG 字符串中提取宽高 (支持 width="100" 和 viewBox)
 */
_extractSvgDimensions(svgString, callback) {
    try {
        // 正则匹配 width="..."
        const wMatch = svgString.match(/width="([^"]+)"/);
        const hMatch = svgString.match(/height="([^"]+)"/);
        let w = 100, h = 100;

        if (wMatch && hMatch) {
            w = parseFloat(wMatch[1]);
            h = parseFloat(hMatch[1]); // 修正：这里应该是 hMatch[1]
        }
        
        // 如果没有宽高属性，尝试解析 viewBox
        if (!wMatch && !hMatch) {
            const vbMatch = svgString.match(/viewBox="([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)"/);
            if (vbMatch) {
                w = parseFloat(vbMatch[3]);
                h = parseFloat(vbMatch[4]);
            }
        }
        
        // 确保数值有效
        callback(isNaN(w) ? 100 : w, isNaN(h) ? 100 : h);
    } catch (e) {
        callback(100, 100);
    }
}


/**
 * 递归工具函数：将 Scratch 官方扁平 ID 引用结构转为嵌套对象结构
 * @private
 */
_transformStandardToNested(blocks, blockId) {
  const block = blocks[blockId];
  if (!block) return null;

  const result = {
    opcode: block.opcode,
    inputs: {},
    fields: block.fields || {},
    next: null,
    substack: {}
  };

  // 处理输入 (Inputs)
  for (const [name, inputData] of Object.entries(block.inputs)) {
    // [1, "ID"] 格式表示后面跟着一个积木 ID
    const targetId = Array.isArray(inputData) && inputData.length > 1 ? inputData[1] : null;

    if (name.includes('SUBSTACK')) {
      // 处理循环体内部 (如 repeat)
      if (targetId && blocks[targetId]) {
        result.substack[name] = this._transformStandardToNested(blocks, targetId);
      }
    } else {
      // 处理普通输入槽
      if (typeof targetId === 'string' && blocks[targetId]) {
        result.inputs[name] = this._transformStandardToNested(blocks, targetId);
      } else {
        // 如果是直接值 (如 [1, [10, "10"]])，提取内部的原始数据
        result.inputs[name] = Array.isArray(inputData) ? inputData : inputData;
      }
    }
  }

  // 处理下一个积木 (Next Chain)
  if (block.next && blocks[block.next]) {
    result.next = this._transformStandardToNested(blocks, block.next);
  }

  return result;
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
 * 【AI -> Scratch】生成新角色
 * @param {string} svgData - SVG代码字符串、Data URI 或 URL
 * @param {string} spriteName - 新角色的名称
 * @returns {Promise<Object>} 创建结果
 */
/**
 * 【AI -> Scratch】生成新角色
 */
async createSprite(svgData, spriteName = 'AI Character') {
    if (!this._vm) return { success: false, error: "VM not ready" };

    try {
        console.log(`CoSparkBridge: 创建新角色 "${spriteName}"...`);
        
        // 1. 解析输入数据，获取 format, width, height
        const { data, format, width, height } = await this._parseInputData(svgData);
        const isSvg = format === 'SVG';

        // 2. 注册资产
        const storage = this._vm.runtime.storage;
        const AssetType = storage.AssetType;
        const DataFormat = storage.DataFormat;

        // 👉 关键修复：SVG 必须使用 ImageVector 类型
        const assetType = isSvg ? AssetType.ImageVector : AssetType.ImageBitmap;
        
        const asset = storage.createAsset(
            assetType, 
            isSvg ? DataFormat.SVG : DataFormat.PNG,
            data,
            null,
            true
        );

        const md5ext = `${asset.assetId}.${asset.dataFormat}`;

        // 3. 计算旋转中心 (SVG 中心点应为画布中心)
        const costumeObject = {
            name: '造型',
            md5: md5ext,
            assetId: asset.assetId,
            asset: asset,
            dataFormat: asset.dataFormat,
            bitmapResolution: 1,
            // 👉 关键修复：旋转中心设为 SVG 宽高的一半
            rotationCenterX: width / 2,
            rotationCenterY: height / 2
        };

        // 4. 构造角色对象
        const newSpriteObject = {
            isStage: false,
            name: spriteName,
            costumes: [costumeObject],
            sounds: [],
            blocks: {},
            variables: {},
            visible: true,
            x: 0, // 舞台中心
            y: 0,
            size: 100,
            direction: 90
        };

        // 5. 注入到 VM
        await this._vm.addSprite(newSpriteObject);

        this._vm.emitTargetsUpdate();
        this._vm.runtime.requestRedraw();

        return { success: true, spriteName, md5ext };

    } catch (e) {
        console.error("CoSpark Create Sprite Error:", e);
        return { success: false, error: e.message };
    }
}

/**
 * 【AI -> Scratch】替换当前角色的造型
 * @param {string} svgData - SVG代码字符串、Data URI 或 URL
 * @returns {Promise<Object>} 替换结果
 */
/**
 * 【核心方法】替换当前角色的造型 (支持 SVG 字符串/URL)
 * @param {string} svgData - SVG代码字符串、Data URI 或 URL
 */
async replaceSpriteImage(svgData) {
    if (!this._vm) return { success: false, error: "VM not ready" };

    try {
        const { data, format, width, height } = await this._parseInputData(svgData);
        const isSvg = format === 'SVG';

        const storage = this._vm.runtime.storage;
        const assetType = isSvg ? storage.AssetType.ImageVector : storage.AssetType.ImageBitmap;
        const dataFormat = isSvg ? storage.DataFormat.SVG : storage.DataFormat.PNG;
        
        const asset = storage.createAsset(assetType, dataFormat, data, null, true);
        const md5ext = `${asset.assetId}.${asset.dataFormat}`;

        const costumeObject = {
            name: '新造型',
            md5: md5ext,
            assetId: asset.assetId,
            asset: asset,
            dataFormat: asset.dataFormat,
            bitmapResolution: 1,
            rotationCenterX: width / 2,
            rotationCenterY: height / 2
        };

        // 注入到当前角色
        const editingTarget = this._vm.editingTarget;
        if (!editingTarget || editingTarget.isStage) {
            return { success: false, error: "请先选中一个角色" };
        }

        await this._vm.addCostume(editingTarget.id, md5ext, costumeObject);
        
        // 切换到新造型
        editingTarget.setCostume(editingTarget.costumes.length - 1);
        
        this._vm.emitTargetsUpdate();
        this._vm.runtime.requestRedraw();

        return { success: true, spriteName: editingTarget.getName() };

    } catch (e) {
        console.error("CoSpark Replace Sprite Error:", e);
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
  /**
 * 设置 postMessage 监听，支持跨域调用
 */
_setupMessageListener() {
  if (this._messageListenerAdded) return;
  this._messageListenerAdded = true;

  window.addEventListener('message', async (event) => {
    // 安全检查：如果配置了允许的域名列表，则验证 origin
    if (this.allowedOrigins[0] !== '*') {
      if (!this.allowedOrigins.includes(event.origin)) {
        console.warn(`CoSparkBridge: 拒绝来自 ${event.origin} 的消息`);
        return;
      }
    }

    const { type, method, params, id } = event.data || {};
    
    // 只处理 CoSparkAI 相关的请求
    if (type !== 'COSPARK_REQUEST') return;

    // 检查方法是否存在
    if (!window.CoSparkAI || typeof window.CoSparkAI[method] !== 'function') {
      this._sendMessageResponse(event.source, event.origin, {
        type: 'COSPARK_RESPONSE',
        id,
        error: `方法 ${method} 不存在`
      });
      return;
    }

    try {
      // 调用对应方法，支持异步
      const result = await window.CoSparkAI[method](...params);
      this._sendMessageResponse(event.source, event.origin, {
        type: 'COSPARK_RESPONSE',
        id,
        result
      });
    } catch (error) {
      this._sendMessageResponse(event.source, event.origin, {
        type: 'COSPARK_RESPONSE',
        id,
        error: error.message
      });
    }
  });
}

/**
 * 发送响应消息
 */
_sendMessageResponse(target, origin, data) {
  // 如果 origin 为 '*'，则使用 '*' 可能导致浏览器警告，最好使用具体的 origin
  // 这里使用 target.origin 或 event.origin，但 target 是 Window 对象，没有 origin 属性
  // 可以用 '*' 或从事件中保存的 origin
  target.postMessage(data, { targetOrigin: origin === '*' ? '*' : origin });
}
}

// 导出单例实例
export default new CoSparkBridge();