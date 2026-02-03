/**
 * CoSparkAI Opcode 映射表
 * 包含Scratch 3.0所有支持的积木类型和参数验证
 */

export const OPCODE_WHITELIST = {
  // ========== 事件积木 ==========
  'event_whenflagclicked': {
    name: '当绿旗被点击',
    category: 'event',
    inputs: {},
    fields: {}
  },
  'event_whenkeypressed': {
    name: '当按下键',
    category: 'event',
    inputs: {},
    fields: {
      KEY_OPTION: { type: 'string', required: true }
    }
  },
  'event_whenthisspriteclicked': {
    name: '当角色被点击',
    category: 'event',
    inputs: {},
    fields: {}
  },
  'event_whenbackdropswitchesto': {
    name: '当背景切换为',
    category: 'event',
    inputs: {},
    fields: {
      BACKDROP: { type: 'string', required: true }
    }
  },
  'event_whengreaterthan': {
    name: '当大于',
    category: 'event',
    inputs: {
      VALUE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      WHENGREATERTHANMENU: { type: 'string', required: true }
    }
  },
  'event_whenbroadcastreceived': {
    name: '当接收到消息',
    category: 'event',
    inputs: {},
    fields: {
      BROADCAST_OPTION: { type: 'string', required: true }
    }
  },

  // ========== 运动积木 ==========
  'motion_movesteps': {
    name: '移动步数',
    category: 'motion',
    inputs: {
      STEPS: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_turnright': {
    name: '右转',
    category: 'motion',
    inputs: {
      DEGREES: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_turnleft': {
    name: '左转',
    category: 'motion',
    inputs: {
      DEGREES: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_goto': {
    name: '移到',
    category: 'motion',
    inputs: {
      TO: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'motion_gotoxy': {
    name: '移到X:Y',
    category: 'motion',
    inputs: {
      X: { type: 'number', shadowType: 'math_number' },
      Y: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_glideto': {
    name: '在秒内滑行到',
    category: 'motion',
    inputs: {
      SECS: { type: 'number', shadowType: 'math_number' },
      TO: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'motion_glidesecstoxy': {
    name: '在秒内滑行到X:Y',
    category: 'motion',
    inputs: {
      SECS: { type: 'number', shadowType: 'math_number' },
      X: { type: 'number', shadowType: 'math_number' },
      Y: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_pointindirection': {
    name: '面向方向',
    category: 'motion',
    inputs: {
      DIRECTION: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_pointtowards': {
    name: '面向',
    category: 'motion',
    inputs: {
      TOWARDS: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'motion_changexby': {
    name: '将X坐标增加',
    category: 'motion',
    inputs: {
      DX: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_setx': {
    name: '将X坐标设为',
    category: 'motion',
    inputs: {
      X: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_changeyby': {
    name: '将Y坐标增加',
    category: 'motion',
    inputs: {
      DY: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_sety': {
    name: '将Y坐标设为',
    category: 'motion',
    inputs: {
      Y: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'motion_ifonedgebounce': {
    name: '碰到边缘就反弹',
    category: 'motion',
    inputs: {},
    fields: {}
  },
  'motion_setrotationstyle': {
    name: '将旋转方式设为',
    category: 'motion',
    inputs: {},
    fields: {
      STYLE: { type: 'string', required: true }
    }
  },

  // ========== 外观积木 ==========
  'looks_sayforsecs': {
    name: '说秒',
    category: 'looks',
    inputs: {
      MESSAGE: { type: 'string', shadowType: 'text' },
      SECS: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'looks_say': {
    name: '说',
    category: 'looks',
    inputs: {
      MESSAGE: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'looks_thinkforsecs': {
    name: '思考秒',
    category: 'looks',
    inputs: {
      MESSAGE: { type: 'string', shadowType: 'text' },
      SECS: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'looks_think': {
    name: '思考',
    category: 'looks',
    inputs: {
      MESSAGE: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'looks_show': {
    name: '显示',
    category: 'looks',
    inputs: {},
    fields: {}
  },
  'looks_hide': {
    name: '隐藏',
    category: 'looks',
    inputs: {},
    fields: {}
  },
  'looks_switchcostumeto': {
    name: '切换造型为',
    category: 'looks',
    inputs: {
      COSTUME: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'looks_nextcostume': {
    name: '下一个造型',
    category: 'looks',
    inputs: {},
    fields: {}
  },
  'looks_switchbackdropto': {
    name: '切换背景为',
    category: 'looks',
    inputs: {
      BACKDROP: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'looks_nextbackdrop': {
    name: '下一个背景',
    category: 'looks',
    inputs: {},
    fields: {}
  },
  'looks_changeeffectby': {
    name: '将特效增加',
    category: 'looks',
    inputs: {
      CHANGE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      EFFECT: { type: 'string', required: true }
    }
  },
  'looks_seteffectto': {
    name: '将特效设为',
    category: 'looks',
    inputs: {
      VALUE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      EFFECT: { type: 'string', required: true }
    }
  },
  'looks_cleargraphiceffects': {
    name: '清除图形特效',
    category: 'looks',
    inputs: {},
    fields: {}
  },
  'looks_changesizeby': {
    name: '将大小增加',
    category: 'looks',
    inputs: {
      CHANGE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'looks_setsizeto': {
    name: '将大小设为',
    category: 'looks',
    inputs: {
      SIZE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'looks_gotofrontback': {
    name: '移到最前面/最后面',
    category: 'looks',
    inputs: {},
    fields: {
      FRONT_BACK: { type: 'string', required: true }
    }
  },
  'looks_goforwardbackwardlayers': {
    name: '前移/后移层',
    category: 'looks',
    inputs: {
      NUM: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      FORWARD_BACKWARD: { type: 'string', required: true }
    }
  },

  // ========== 声音积木 ==========
  'sound_playuntildone': {
    name: '播放声音直到结束',
    category: 'sound',
    inputs: {
      SOUND_MENU: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'sound_play': {
    name: '播放声音',
    category: 'sound',
    inputs: {
      SOUND_MENU: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'sound_stopallsounds': {
    name: '停止所有声音',
    category: 'sound',
    inputs: {},
    fields: {}
  },
  'sound_changeeffectby': {
    name: '将音效增加',
    category: 'sound',
    inputs: {
      VALUE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      EFFECT: { type: 'string', required: true }
    }
  },
  'sound_seteffectto': {
    name: '将音效设为',
    category: 'sound',
    inputs: {
      VALUE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      EFFECT: { type: 'string', required: true }
    }
  },
  'sound_cleareffects': {
    name: '清除音效',
    category: 'sound',
    inputs: {},
    fields: {}
  },
  'sound_changevolumeby': {
    name: '将音量增加',
    category: 'sound',
    inputs: {
      VOLUME: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'sound_setvolumeto': {
    name: '将音量设为',
    category: 'sound',
    inputs: {
      VOLUME: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },

  // ========== 控制积木 ==========
  'control_wait': {
    name: '等待秒',
    category: 'control',
    inputs: {
      DURATION: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'control_repeat': {
    name: '重复执行',
    category: 'control',
    inputs: {
      TIMES: { type: 'number', shadowType: 'math_number' }
    },
    substacks: ['SUBSTACK']
  },
  'control_forever': {
    name: '重复执行',
    category: 'control',
    substacks: ['SUBSTACK']
  },
  'control_if': {
    name: '如果那么',
    category: 'control',
    inputs: {
      CONDITION: { type: 'boolean' }
    },
    substacks: ['SUBSTACK']
  },
  'control_if_else': {
    name: '如果那么否则',
    category: 'control',
    inputs: {
      CONDITION: { type: 'boolean' }
    },
    substacks: ['SUBSTACK', 'SUBSTACK2']
  },
  'control_wait_until': {
    name: '等待直到',
    category: 'control',
    inputs: {
      CONDITION: { type: 'boolean' }
    },
    fields: {}
  },
  'control_repeat_until': {
    name: '重复执行直到',
    category: 'control',
    inputs: {
      CONDITION: { type: 'boolean' }
    },
    substacks: ['SUBSTACK']
  },
  'control_stop': {
    name: '停止',
    category: 'control',
    inputs: {},
    fields: {
      STOP_OPTION: { type: 'string', required: true }
    }
  },

  // ========== 侦测积木 ==========
  'sensing_touchingobject': {
    name: '碰到',
    category: 'sensing',
    inputs: {
      TOUCHINGOBJECTMENU: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'sensing_touchingcolor': {
    name: '碰到颜色',
    category: 'sensing',
    inputs: {
      COLOR: { type: 'color', shadowType: 'colour_picker' }
    },
    fields: {}
  },
  'sensing_coloristouchingcolor': {
    name: '颜色碰到颜色',
    category: 'sensing',
    inputs: {
      COLOR: { type: 'color', shadowType: 'colour_picker' },
      COLOR2: { type: 'color', shadowType: 'colour_picker' }
    },
    fields: {}
  },
  'sensing_distanceto': {
    name: '到的距离',
    category: 'sensing',
    inputs: {
      DISTANCETOMENU: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'sensing_askandwait': {
    name: '询问并等待',
    category: 'sensing',
    inputs: {
      QUESTION: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'sensing_keypressed': {
    name: '按键是否按下',
    category: 'sensing',
    inputs: {},
    fields: {
      KEY_OPTION: { type: 'string', required: true }
    }
  },
  'sensing_mousedown': {
    name: '鼠标是否按下',
    category: 'sensing',
    inputs: {},
    fields: {}
  },

  // ========== 运算积木 ==========
  'operator_add': {
    name: '加',
    category: 'operator',
    inputs: {
      NUM1: { type: 'number', shadowType: 'math_number' },
      NUM2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_subtract': {
    name: '减',
    category: 'operator',
    inputs: {
      NUM1: { type: 'number', shadowType: 'math_number' },
      NUM2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_multiply': {
    name: '乘',
    category: 'operator',
    inputs: {
      NUM1: { type: 'number', shadowType: 'math_number' },
      NUM2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_divide': {
    name: '除',
    category: 'operator',
    inputs: {
      NUM1: { type: 'number', shadowType: 'math_number' },
      NUM2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_random': {
    name: '在到间随机选一个数',
    category: 'operator',
    inputs: {
      FROM: { type: 'number', shadowType: 'math_number' },
      TO: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_lt': {
    name: '小于',
    category: 'operator',
    inputs: {
      OPERAND1: { type: 'number', shadowType: 'math_number' },
      OPERAND2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_equals': {
    name: '等于',
    category: 'operator',
    inputs: {
      OPERAND1: { type: 'number', shadowType: 'math_number' },
      OPERAND2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_gt': {
    name: '大于',
    category: 'operator',
    inputs: {
      OPERAND1: { type: 'number', shadowType: 'math_number' },
      OPERAND2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_and': {
    name: '与',
    category: 'operator',
    inputs: {
      OPERAND1: { type: 'boolean' },
      OPERAND2: { type: 'boolean' }
    },
    fields: {}
  },
  'operator_or': {
    name: '或',
    category: 'operator',
    inputs: {
      OPERAND1: { type: 'boolean' },
      OPERAND2: { type: 'boolean' }
    },
    fields: {}
  },
  'operator_not': {
    name: '不成立',
    category: 'operator',
    inputs: {
      OPERAND: { type: 'boolean' }
    },
    fields: {}
  },
  'operator_join': {
    name: '连接',
    category: 'operator',
    inputs: {
      STRING1: { type: 'string', shadowType: 'text' },
      STRING2: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'operator_letter_of': {
    name: '第个字符',
    category: 'operator',
    inputs: {
      LETTER: { type: 'number', shadowType: 'math_number' },
      STRING: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'operator_length': {
    name: '的长度',
    category: 'operator',
    inputs: {
      STRING: { type: 'string', shadowType: 'text' }
    },
    fields: {}
  },
  'operator_mod': {
    name: '除以的余数',
    category: 'operator',
    inputs: {
      NUM1: { type: 'number', shadowType: 'math_number' },
      NUM2: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_round': {
    name: '四舍五入',
    category: 'operator',
    inputs: {
      NUM: { type: 'number', shadowType: 'math_number' }
    },
    fields: {}
  },
  'operator_mathop': {
    name: '数学运算',
    category: 'operator',
    inputs: {
      NUM: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      OPERATOR: { type: 'string', required: true }
    }
  },

  // ========== 变量积木 ==========
  'data_setvariableto': {
    name: '将变量设为',
    category: 'data',
    inputs: {
      VALUE: { type: 'any' }
    },
    fields: {
      VARIABLE: { type: 'variable', required: true }
    }
  },
  'data_changevariableby': {
    name: '将变量增加',
    category: 'data',
    inputs: {
      VALUE: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      VARIABLE: { type: 'variable', required: true }
    }
  },
  'data_showvariable': {
    name: '显示变量',
    category: 'data',
    inputs: {},
    fields: {
      VARIABLE: { type: 'variable', required: true }
    }
  },
  'data_hidevariable': {
    name: '隐藏变量',
    category: 'data',
    inputs: {},
    fields: {
      VARIABLE: { type: 'variable', required: true }
    }
  },

  // ========== 列表积木 ==========
  'data_addtolist': {
    name: '将项加入列表',
    category: 'data',
    inputs: {
      ITEM: { type: 'any' }
    },
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_deleteoflist': {
    name: '删除列表中第项',
    category: 'data',
    inputs: {
      INDEX: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_deletealloflist': {
    name: '删除列表的全部项',
    category: 'data',
    inputs: {},
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_insertatlist': {
    name: '在列表中第项前插入',
    category: 'data',
    inputs: {
      INDEX: { type: 'number', shadowType: 'math_number' },
      ITEM: { type: 'any' }
    },
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_replaceitemoflist': {
    name: '替换列表中第项',
    category: 'data',
    inputs: {
      INDEX: { type: 'number', shadowType: 'math_number' },
      ITEM: { type: 'any' }
    },
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_itemoflist': {
    name: '列表中的第项',
    category: 'data',
    inputs: {
      INDEX: { type: 'number', shadowType: 'math_number' }
    },
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_lengthoflist': {
    name: '列表的长度',
    category: 'data',
    inputs: {},
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_listcontainsitem': {
    name: '列表是否包含',
    category: 'data',
    inputs: {
      ITEM: { type: 'any' }
    },
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_showlist': {
    name: '显示列表',
    category: 'data',
    inputs: {},
    fields: {
      LIST: { type: 'list', required: true }
    }
  },
  'data_hidelist': {
    name: '隐藏列表',
    category: 'data',
    inputs: {},
    fields: {
      LIST: { type: 'list', required: true }
    }
  }
};

/**
 * 获取所有支持的Opcode列表
 * @returns {string[]} Opcode数组
 */
export function getAllOpcodes() {
  return Object.keys(OPCODE_WHITELIST);
}

/**
 * 检查Opcode是否在白名单中
 * @param {string} opcode - 要检查的Opcode
 * @returns {boolean} 是否有效
 */
export function isValidOpcode(opcode) {
  return opcode in OPCODE_WHITELIST;
}

/**
 * 获取Opcode的详细信息
 * @param {string} opcode - Opcode名称
 * @returns {Object|null} Opcode信息或null
 */
export function getOpcodeInfo(opcode) {
  return OPCODE_WHITELIST[opcode] || null;
}

/**
 * 获取积木类别
 * @param {string} opcode - Opcode名称
 * @returns {string|null} 类别名称
 */
export function getOpcodeCategory(opcode) {
  const info = getOpcodeInfo(opcode);
  return info ? info.category : null;
}

/**
 * 检查Opcode是否有特定输入
 * @param {string} opcode - Opcode名称
 * @param {string} inputName - 输入名称
 * @returns {boolean} 是否有该输入
 */
export function hasInput(opcode, inputName) {
  const info = getOpcodeInfo(opcode);
  return info && info.inputs && inputName in info.inputs;
}

/**
 * 检查Opcode是否有特定字段
 * @param {string} opcode - Opcode名称
 * @param {string} fieldName - 字段名称
 * @returns {boolean} 是否有该字段
 */
export function hasField(opcode, fieldName) {
  const info = getOpcodeInfo(opcode);
  return info && info.fields && fieldName in info.fields;
}

/**
 * 检查Opcode是否有子堆栈
 * @param {string} opcode - Opcode名称
 * @returns {boolean} 是否有子堆栈
 */
export function hasSubstack(opcode) {
  const info = getOpcodeInfo(opcode);
  return info && info.substacks && info.substacks.length > 0;
}