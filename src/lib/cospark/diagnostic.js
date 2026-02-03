/**
 * CoSpark 诊断工具
 */
export function diagnoseCoSpark() {
    console.group("🔍 CoSpark 诊断报告");
    
    // 1. 检查全局变量
    const checks = {
        'window.CoSparkAI': !!window.CoSparkAI,
        'window.Blockly': !!window.Blockly,
        'window.Blockly.getMainWorkspace': !!(window.Blockly && window.Blockly.getMainWorkspace),
        'workspace': !!(window.Blockly && window.Blockly.getMainWorkspace()),
        'workspace.getAllBlocks': !!(window.Blockly && window.Blockly.getMainWorkspace() && window.Blockly.getMainWorkspace().getAllBlocks)
    };
    
    console.table(checks);
    
    // 2. 检查工作区状态
    if (window.Blockly) {
        const workspace = window.Blockly.getMainWorkspace();
        if (workspace) {
            const blocks = workspace.getAllBlocks();
            console.log(`工作区有 ${blocks.length} 个积木`);
            
            // 显示每个积木的位置
            blocks.forEach((block, index) => {
                try {
                    const pos = block.getRelativeToSurfaceXY();
                    console.log(`积木 ${index} (${block.type}): (${pos.x}, ${pos.y})`);
                } catch (e) {
                    console.log(`积木 ${index}: 无法获取位置`);
                }
            });
        }
    }
    
    // 3. 测试生成功能
    const testPayload = {
        opcode: "event_whenflagclicked",
        next: {
            opcode: "motion_movesteps",
            inputs: { STEPS: 50 }
        }
    };
    
    console.log("📋 测试 Payload:", testPayload);
    
    if (window.CoSparkAI) {
        console.log("🎯 正在测试生成功能...");
        const result = window.CoSparkAI.generate(testPayload);
        console.log("生成结果:", result);
        
        // 等待后检查
        setTimeout(() => {
            console.log("🔄 2秒后检查工作区...");
            const workspace = window.Blockly.getMainWorkspace();
            const blocks = workspace.getAllBlocks();
            console.log(`现在有 ${blocks.length} 个积木`);
            
            // 查找新积木
            blocks.forEach((block, index) => {
                const pos = block.getRelativeToSurfaceXY();
                if (pos.x < 100 && pos.y < 100) {
                    console.log(`⚠️ 积木 ${index} 在可疑位置 (${pos.x}, ${pos.y})`);
                }
            });
            
            console.groupEnd();
        }, 2000);
    } else {
        console.error("❌ CoSparkAI 未定义");
        console.groupEnd();
    }
}

// 添加到全局
if (window) {
    window.diagnoseCoSpark = diagnoseCoSpark;
}