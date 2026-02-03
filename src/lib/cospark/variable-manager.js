/**
 * CoSparkAI 变量管理器
 * 处理变量创建、查找和同步
 */

export class VariableManager {
  /**
   * 构造函数
   * @param {Object} vm - Scratch VM实例
   */
  constructor(vm) {
    this.vm = vm;
    this.variableCache = new Map(); // 缓存变量信息
  }
  
  /**
   * 初始化变量管理器
   */
  initialize() {
    if (!this.vm || !this.vm.editingTarget) {
      console.warn('VariableManager: VM未就绪');
      return;
    }
    
    this._refreshVariableCache();
    console.log('VariableManager: 已初始化');
  }
  
  /**
   * 刷新变量缓存
   */
  _refreshVariableCache() {
    if (!this.vm.editingTarget) return;
    
    this.variableCache.clear();
    const variables = this.vm.editingTarget.variables;
    
    Object.values(variables).forEach(variable => {
      if (variable.type === '') { // 普通变量
        this.variableCache.set(variable.name, {
          id: variable.id,
          name: variable.name,
          value: variable.value,
          isCloud: variable.isCloud || false
        });
      } else if (variable.type === 'list') { // 列表
        this.variableCache.set(variable.name, {
          id: variable.id,
          name: variable.name,
          type: 'list',
          value: variable.value || [],
          isCloud: variable.isCloud || false
        });
      }
    });
  }
  
  /**
   * 获取所有变量
   * @returns {Array} 变量数组
   */
  getAllVariables() {
    this._refreshVariableCache();
    return Array.from(this.variableCache.values());
  }
  
  /**
   * 查找变量
   * @param {string} variableName - 变量名
   * @returns {Object|null} 变量信息或null
   */
  findVariable(variableName) {
    this._refreshVariableCache();
    return this.variableCache.get(variableName) || null;
  }
  
  /**
   * 创建变量（如果不存在）
   * @param {string} variableName - 变量名
   * @param {string} variableType - 变量类型 ('variable' 或 'list')
   * @param {any} initialValue - 初始值
   * @returns {Object} 变量信息
   */
  createVariableIfNotExists(variableName, variableType = 'variable', initialValue = 0) {
    if (!this.vm.editingTarget) {
      throw new Error('无法创建变量: 没有编辑目标');
    }
    
    // 检查变量是否已存在
    const existingVariable = this.findVariable(variableName);
    if (existingVariable) {
      return existingVariable;
    }
    
    console.log(`VariableManager: 创建新${variableType}: "${variableName}"`);
    
    // 创建变量
    const variableId = this.vm.runtime.obtainNewVariableId();
    const variable = {
      name: variableName,
      id: variableId,
      type: variableType === 'list' ? 'list' : '',
      value: initialValue,
      isCloud: false
    };
    
    // 添加到编辑目标
    this.vm.editingTarget.variables[variableId] = variable;
    
    // 添加到缓存
    this.variableCache.set(variableName, {
      id: variableId,
      name: variableName,
      type: variableType === 'list' ? 'list' : 'variable',
      value: initialValue,
      isCloud: false
    });
    
    // 通知VM更新
    this.vm.emitTargetsUpdate();
    
    return this.variableCache.get(variableName);
  }
  
  /**
   * 在Blockly工作区中创建变量
   * @param {string} variableName - 变量名
   * @param {string} variableType - 变量类型
   * @returns {boolean} 是否成功
   */
  createVariableInWorkspace(variableName, variableType = 'variable') {
    if (!window.Blockly) {
      console.error('Blockly未加载');
      return false;
    }
    
    const workspace = window.Blockly.getMainWorkspace();
    if (!workspace) {
      console.error('Blockly工作区未找到');
      return false;
    }
    
    try {
      // 在Blockly中创建变量
      workspace.createVariable(variableName, variableType === 'list' ? 'List' : '');
      
      // 同时在VM中创建变量
      this.createVariableIfNotExists(variableName, variableType);
      
      return true;
    } catch (error) {
      console.error('创建变量失败:', error);
      return false;
    }
  }
  
  /**
   * 预扫描AI JSON中的变量并创建
   * @param {Object} aiJson - AI JSON
   */
  preprocessVariables(aiJson) {
    if (!aiJson || typeof aiJson !== 'object') return;
    
    // 递归查找变量引用
    function findVariables(node, variables) {
      if (!node || typeof node !== 'object') return;
      
      // 检查fields中的变量引用
      if (node.fields && node.fields.VARIABLE) {
        variables.add(node.fields.VARIABLE);
      }
      if (node.fields && node.fields.LIST) {
        variables.add(node.fields.LIST);
      }
      
      // 递归检查子堆栈和next
      if (node.substack && typeof node.substack === 'object') {
        Object.values(node.substack).forEach(sub => findVariables(sub, variables));
      }
      
      if (node.next) {
        findVariables(node.next, variables);
      }
      
      // 检查inputs中的嵌套积木
      if (node.inputs && typeof node.inputs === 'object') {
        Object.values(node.inputs).forEach(value => {
          if (value && typeof value === 'object' && value.opcode) {
            findVariables(value, variables);
          }
        });
      }
    }
    
    const variables = new Set();
    findVariables(aiJson, variables);
    
    // 创建所有发现的变量
    variables.forEach(variableName => {
      this.createVariableInWorkspace(variableName, 'variable');
    });
  }
  
  /**
   * 获取变量使用统计
   * @returns {Object} 统计信息
   */
  getStatistics() {
    this._refreshVariableCache();
    const variables = this.getAllVariables();
    
    return {
      total: variables.length,
      regularVariables: variables.filter(v => v.type !== 'list').length,
      lists: variables.filter(v => v.type === 'list').length,
      cloudVariables: variables.filter(v => v.isCloud).length
    };
  }
}