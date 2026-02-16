/**
 * CoSparkAI 生产级积木适配器
 * 负责将AI生成的JSON安全地转换为Scratch XML
 */

import { OPCODE_WHITELIST, isValidOpcode, getOpcodeInfo } from './opcode-mapper.js';

export default class BlockAdapter {
  /**
   * 将AI JSON转换为Scratch XML字符串
   * @param {Object} blockNode - AI生成的积木节点
   * @returns {string} 符合Scratch规范的XML字符串
   */
  static jsonToXml(blockNode) {
    if (!blockNode || typeof blockNode !== 'object') {
      console.error('BlockAdapter: 无效的积木节点');
      return '<xml></xml>';
    }
    
    // 验证opcode
    if (!blockNode.opcode || !isValidOpcode(blockNode.opcode)) {
      console.error(`BlockAdapter: 无效的opcode: ${blockNode.opcode}`);
      // 仍然尝试生成，但使用安全的后备方案
      return this._createFallbackXml(blockNode);
    }
    
    try {
      // 递归处理积木树
      const innerXml = this._processBlock(blockNode);
      
      // 包裹XML标签（必须包含命名空间）
      const finalXml = `<xml xmlns="http://www.w3.org/1999/xhtml">${innerXml}</xml>`;
      
      return finalXml;
    } catch (error) {
      console.error('BlockAdapter: XML生成失败:', error);
      return '<xml></xml>';
    }
  }
  
  /**
   * 递归处理积木节点
   * @param {Object} node - 积木节点
   * @param {boolean} isTopLevel - 是否是顶层积木
   * @returns {string} XML片段
   */
  static _processBlock(node, isTopLevel = true) {
    if (!node || !node.opcode) return '';
    
    const opcodeInfo = getOpcodeInfo(node.opcode);
    const parts = [];
    
    // 开始积木标签
    let blockTag = `<block type="${node.opcode}"`;
    
    // 如果是顶层积木，添加默认坐标（会在Bridge中覆盖）
    if (isTopLevel) {
      blockTag += ' x="0" y="0"';
    }
    
    blockTag += '>';
    parts.push(blockTag);
    
    // 处理输入参数
    if (node.inputs && typeof node.inputs === 'object') {
      Object.entries(node.inputs).forEach(([inputName, inputValue]) => {
        // 检查输入是否有效
        if (opcodeInfo && opcodeInfo.inputs && inputName in opcodeInfo.inputs) {
          parts.push(`<value name="${inputName}">`);
          parts.push(this._createInputXml(inputValue, opcodeInfo.inputs[inputName].shadowType));
          parts.push('</value>');
        } else {
          // 未知输入，使用安全后备
          console.warn(`BlockAdapter: 未知输入参数 "${inputName}" 在opcode "${node.opcode}"`);
          parts.push(`<value name="${inputName}">`);
          parts.push(this._createSafeShadowValue(inputValue));
          parts.push('</value>');
        }
      });
    }
    
    // 处理字段
    if (node.fields && typeof node.fields === 'object') {
      Object.entries(node.fields).forEach(([fieldName, fieldValue]) => {
        // 转义XML特殊字符
        const escapedValue = this._escapeXml(String(fieldValue));
        parts.push(`<field name="${fieldName}">${escapedValue}</field>`);
      });
    }
    
    // 处理子堆栈
    if (node.substack && typeof node.substack === 'object') {
      Object.entries(node.substack).forEach(([substackName, substackNode]) => {
        parts.push(`<statement name="${substackName}">`);
        parts.push(this._processBlock(substackNode, false));
        parts.push('</statement>');
      });
    }
    
    // 处理Next连接
    if (node.next) {
      parts.push('<next>');
      parts.push(this._processBlock(node.next, false));
      parts.push('</next>');
    }
    
    parts.push('</block>');
    return parts.join('');
  }
  
  /**
   * 创建输入参数的XML
   * @param {any} value - 输入值
   * @param {string} shadowType - Shadow类型
   * @returns {string} XML片段
   */
  static _createInputXml(value, shadowType) {
    // 如果值是嵌套的积木对象
    if (value && typeof value === 'object' && value.opcode) {
      return this._processBlock(value, false);
    }
    
    // 根据shadowType生成对应的Shadow Block
    switch (shadowType) {
      case 'math_number':
        const numValue = typeof value === 'number' ? value : 
                        (typeof value === 'string' && !isNaN(Number(value)) ? Number(value) : 0);
        return `<shadow type="math_number"><field name="NUM">${numValue}</field></shadow>`;
        
      case 'text':
        const strValue = value !== undefined && value !== null ? String(value) : '';
        const escapedStr = this._escapeXml(strValue);
        return `<shadow type="text"><field name="TEXT">${escapedStr}</field></shadow>`;
        
      case 'colour_picker':
        const colorValue = typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value) ? value : '#000000';
        return `<shadow type="colour_picker"><field name="COLOUR">${colorValue}</field></shadow>`;
        
      default:
        // 默认使用安全的后备方案
        return this._createSafeShadowValue(value);
    }
  }
  
  /**
   * 创建安全的Shadow值（后备方案）
   * @param {any} value - 任意值
   * @returns {string} 安全的Shadow XML
   */
  static _createSafeShadowValue(value) {
    if (typeof value === 'number' || (!isNaN(Number(value)) && value !== null && value !== undefined)) {
      const numValue = typeof value === 'number' ? value : Number(value);
      return `<shadow type="math_number"><field name="NUM">${numValue}</field></shadow>`;
    }
    
    if (typeof value === 'string' && value.startsWith('#')) {
      return `<shadow type="colour_picker"><field name="COLOUR">${value}</field></shadow>`;
    }
    
    // 默认作为文本处理
    const strValue = value !== undefined && value !== null ? String(value) : '';
    const escapedStr = this._escapeXml(strValue);
    return `<shadow type="text"><field name="TEXT">${escapedStr}</field></shadow>`;
  }
  
  /**
   * 创建后备XML（当opcode无效时）
   * @param {Object} node - 积木节点
   * @returns {string} 安全的XML
   */
  static _createFallbackXml(node) {
    // 尝试生成一个简单的事件积木作为后备
    const fallbackBlock = {
      opcode: 'event_whenflagclicked',
      next: {
        opcode: 'looks_say',
        inputs: {
          MESSAGE: 'AI积木生成失败，请检查opcode'
        }
      }
    };
    
    return this.jsonToXml(fallbackBlock);
  }
  
  /**
   * 转义XML特殊字符
   * @param {string} str - 原始字符串
   * @returns {string} 转义后的字符串
   */
  static _escapeXml(str) {
    if (typeof str !== 'string') return '';
    
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * 统计积木树中的积木数量
   * @param {Object} blockNode - 积木节点
   * @returns {number} 积木总数
   */
  static countBlocks(blockNode) {
    if (!blockNode || typeof blockNode !== 'object') return 0;
    
    let count = 1; // 当前积木
    
    // 统计子堆栈
    if (blockNode.substack && typeof blockNode.substack === 'object') {
      Object.values(blockNode.substack).forEach(subNode => {
        count += this.countBlocks(subNode);
      });
    }
    
    // 统计Next连接
    if (blockNode.next) {
      count += this.countBlocks(blockNode.next);
    }
    
    // 统计输入中的嵌套积木
    if (blockNode.inputs && typeof blockNode.inputs === 'object') {
      Object.values(blockNode.inputs).forEach(value => {
        if (value && typeof value === 'object' && value.opcode) {
          count += this.countBlocks(value);
        }
      });
    }
    
    return count;
  }
  /**
 * 将官方 SB3 扁平格式转换为适配器支持的嵌套格式
 */
_transformStandardToNested(blocks, blockId) {
    const block = blocks[blockId];
    if (!block) return null;

    // 构建嵌套节点
    const nestedNode = {
        opcode: block.opcode,
        inputs: {},
        fields: block.fields || {},
        substack: {},
        next: null
    };

    // 1. 处理 Inputs 和 Substack
    for (const [name, inputData] of Object.entries(block.inputs)) {
        // 索引 [1, "ID"] 或 [2, "ID"] 代表指向另一个积木
        const targetId = Array.isArray(inputData) && inputData.length > 1 ? inputData[1] : null;

        if (name === 'SUBSTACK' || name === 'SUBSTACK2') {
            // 处理循环/分支内部的积木
            if (typeof targetId === 'string' && blocks[targetId]) {
                nestedNode.substack[name] = this._transformStandardToNested(blocks, targetId);
            }
        } else {
            // 处理普通输入（如数值、字符或嵌套的运算积木）
            if (typeof targetId === 'string' && blocks[targetId]) {
                nestedNode.inputs[name] = this._transformStandardToNested(blocks, targetId);
            } else if (Array.isArray(inputData)) {
                // 如果是直接数值 [1, [10, "10"]] -> 提取 10
                const rawValue = inputData[1];
                nestedNode.inputs[name] = Array.isArray(rawValue) ? rawValue[1] : rawValue;
            }
        }
    }

    // 2. 处理 Next 链
    if (block.next && blocks[block.next]) {
        nestedNode.next = this._transformStandardToNested(blocks, block.next);
    }

    return nestedNode;
}

}