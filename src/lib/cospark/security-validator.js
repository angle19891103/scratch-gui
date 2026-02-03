/**
 * CoSparkAI 安全验证器
 * 确保AI生成的JSON数据安全可靠
 */

import { OPCODE_WHITELIST, isValidOpcode, getOpcodeInfo, hasInput, hasField, hasSubstack } from './opcode-mapper.js';

export class SecurityValidator {
  /**
   * 验证AI生成的JSON结构
   * @param {Object} aiJson - AI生成的JSON
   * @returns {Object} 验证结果 {valid: boolean, errors: string[], warnings: string[]}
   */
  static validateAIJson(aiJson) {
    const errors = [];
    const warnings = [];
    
    // 1. 检查基础结构
    if (!aiJson || typeof aiJson !== 'object') {
      errors.push('AI JSON必须是有效的对象');
      return { valid: false, errors, warnings };
    }
    
    // 2. 检查Opcode是否存在
    if (!aiJson.opcode) {
      errors.push('缺少opcode字段');
    } else if (!isValidOpcode(aiJson.opcode)) {
      errors.push(`无效的opcode: "${aiJson.opcode}"`);
    } else {
      const opcodeInfo = getOpcodeInfo(aiJson.opcode);
      
      // 3. 验证输入参数
      if (aiJson.inputs && typeof aiJson.inputs === 'object') {
        Object.keys(aiJson.inputs).forEach(inputName => {
          if (!hasInput(aiJson.opcode, inputName)) {
            warnings.push(`opcode "${aiJson.opcode}" 不支持输入参数 "${inputName}"`);
          } else {
            // 验证输入值的类型
            const inputValue = aiJson.inputs[inputName];
            const expectedType = opcodeInfo.inputs[inputName].type;
            
            if (!this._validateInputType(inputValue, expectedType)) {
              warnings.push(`输入参数 "${inputName}" 的值类型可能不正确，期望: ${expectedType}`);
            }
          }
        });
      }
      
      // 4. 验证字段
      if (aiJson.fields && typeof aiJson.fields === 'object') {
        Object.keys(aiJson.fields).forEach(fieldName => {
          if (!hasField(aiJson.opcode, fieldName)) {
            warnings.push(`opcode "${aiJson.opcode}" 不支持字段 "${fieldName}"`);
          }
        });
      }
      
      // 5. 验证必填字段
      if (opcodeInfo.fields) {
        Object.entries(opcodeInfo.fields).forEach(([fieldName, fieldConfig]) => {
          if (fieldConfig.required && (!aiJson.fields || !(fieldName in aiJson.fields))) {
            warnings.push(`缺少必填字段: "${fieldName}"`);
          }
        });
      }
      
      // 6. 验证子堆栈
      if (aiJson.substack && typeof aiJson.substack === 'object') {
        if (!hasSubstack(aiJson.opcode)) {
          warnings.push(`opcode "${aiJson.opcode}" 不支持子堆栈`);
        } else {
          Object.keys(aiJson.substack).forEach(substackName => {
            if (!opcodeInfo.substacks.includes(substackName)) {
              warnings.push(`无效的子堆栈名称: "${substackName}"，有效值: ${opcodeInfo.substacks.join(', ')}`);
            } else {
              // 递归验证子堆栈
              const subValidation = this.validateAIJson(aiJson.substack[substackName]);
              if (!subValidation.valid) {
                errors.push(`子堆栈 "${substackName}" 验证失败: ${subValidation.errors.join(', ')}`);
              }
              warnings.push(...subValidation.warnings);
            }
          });
        }
      }
      
      // 7. 验证next连接
      if (aiJson.next) {
        const nextValidation = this.validateAIJson(aiJson.next);
        if (!nextValidation.valid) {
          errors.push(`next积木验证失败: ${nextValidation.errors.join(', ')}`);
        }
        warnings.push(...nextValidation.warnings);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 验证输入值类型
   * @param {any} value - 输入值
   * @param {string} expectedType - 期望类型
   * @returns {boolean} 是否有效
   */
  static _validateInputType(value, expectedType) {
    if (expectedType === 'any') return true;
    
    if (expectedType === 'number') {
      return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)));
    }
    
    if (expectedType === 'string') {
      return typeof value === 'string';
    }
    
    if (expectedType === 'boolean') {
      return typeof value === 'boolean' || (typeof value === 'object' && value.opcode);
    }
    
    if (expectedType === 'color') {
      return typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value);
    }
    
    if (expectedType === 'variable') {
      return typeof value === 'string';
    }
    
    if (expectedType === 'list') {
      return typeof value === 'string';
    }
    
    return true;
  }
  
  /**
   * 清理和规范化AI JSON
   * @param {Object} aiJson - 原始AI JSON
   * @returns {Object} 清理后的JSON
   */
  static sanitizeAIJson(aiJson) {
    if (!aiJson || typeof aiJson !== 'object') {
      return aiJson;
    }
    
    const sanitized = { ...aiJson };
    
    // 确保opcode是字符串
    if (sanitized.opcode && typeof sanitized.opcode !== 'string') {
      sanitized.opcode = String(sanitized.opcode);
    }
    
    // 清理inputs
    if (sanitized.inputs && typeof sanitized.inputs === 'object') {
      const cleanedInputs = {};
      Object.entries(sanitized.inputs).forEach(([key, value]) => {
        // 移除空值
        if (value !== null && value !== undefined) {
          cleanedInputs[key] = value;
        }
      });
      sanitized.inputs = cleanedInputs;
    }
    
    // 清理fields
    if (sanitized.fields && typeof sanitized.fields === 'object') {
      const cleanedFields = {};
      Object.entries(sanitized.fields).forEach(([key, value]) => {
        // 确保字段值是字符串
        cleanedFields[key] = String(value);
      });
      sanitized.fields = cleanedFields;
    }
    
    // 递归清理子堆栈
    if (sanitized.substack && typeof sanitized.substack === 'object') {
      const cleanedSubstack = {};
      Object.entries(sanitized.substack).forEach(([key, value]) => {
        cleanedSubstack[key] = this.sanitizeAIJson(value);
      });
      sanitized.substack = cleanedSubstack;
    }
    
    // 递归清理next
    if (sanitized.next) {
      sanitized.next = this.sanitizeAIJson(sanitized.next);
    }
    
    return sanitized;
  }
  
  /**
   * 限制积木数量（防止生成过多积木）
   * @param {Object} aiJson - AI JSON
   * @param {number} maxBlocks - 最大积木数
   * @returns {Object} 验证结果 {valid: boolean, count: number, errors: string[]}
   */
  static validateBlockCount(aiJson, maxBlocks = 100) {
    let count = 0;
    const errors = [];
    
    function countBlocks(node) {
      if (!node || typeof node !== 'object') return;
      
      count++;
      if (count > maxBlocks) {
        errors.push(`积木数量超过限制: ${count} > ${maxBlocks}`);
        return;
      }
      
      // 计算子堆栈
      if (node.substack && typeof node.substack === 'object') {
        Object.values(node.substack).forEach(countBlocks);
      }
      
      // 计算next
      if (node.next) {
        countBlocks(node.next);
      }
    }
    
    countBlocks(aiJson);
    
    return {
      valid: errors.length === 0,
      count,
      errors
    };
  }
}