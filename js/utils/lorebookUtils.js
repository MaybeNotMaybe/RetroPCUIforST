// js/utils/lorebookUtils.js
class LorebookUtils {
    // 设置世界书条目的启用状态
    static async toggleLorebookEntry(lorebookName, commentName, enable) {
        try {
            // 获取世界书中的所有条目
            const entries = await getLorebookEntries(lorebookName);
            
            // 查找指定comment的条目
            const targetEntry = entries.find(entry => 
                entry.comment.toLowerCase() === commentName.toLowerCase());
            
            if (!targetEntry) {
                console.error(`未找到条目: ${commentName}`);
                return false;
            }
            
            // 如果状态已经是目标状态，无需修改
            if (targetEntry.enabled === enable) {
                console.log(`条目 ${commentName} 已经${enable ? '启用' : '禁用'}`);
                return true;
            }
            
            // 修改条目状态
            targetEntry.enabled = enable;
            await setLorebookEntries(lorebookName, [targetEntry]);
            console.log(`已${enable ? '启用' : '禁用'}条目: ${commentName}`);
            return true;
        } catch (error) {
            console.error(`设置条目状态时出错: ${commentName}`, error);
            return false;
        }
    }
}

// 全局可访问
window.LorebookUtils = LorebookUtils;