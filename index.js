(function () {
    const extensionName = "jsonSchemaHelper";

    console.log("[Json Schema助手] 脚本已加载，正在初始化...");
    const { eventSource, event_types, saveSettingsDebounced, extensionSettings, substituteParams } = SillyTavern.getContext();

    if (!eventSource) {
        console.error("[Json Schema助手] 严重错误: 无法获取 SillyTavern 上下文！");
        return;
    }

    const defaultSettings = {
        enabled: false,
        mode: "static", 
        jsonSchema: ""
    };

    let settings = Object.assign({}, defaultSettings);

    function loadSettings() {
        if (!extensionSettings[extensionName]) {
            extensionSettings[extensionName] = Object.assign({}, defaultSettings);
        }
        if (!extensionSettings[extensionName].mode) {
            extensionSettings[extensionName].mode = "static";
        }
        settings = Object.assign({}, defaultSettings, extensionSettings[extensionName]);
    }

    function saveSettings() {
        extensionSettings[extensionName] = settings;
        saveSettingsDebounced();
    }

    // ----------- UI 构建 -----------
    const settingsHtml = `
        <div id="google_schema_settings_container" class="settings-adv-block">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>Json Schema Helper</b>
                    <div class="inline-drawer-icon fa-solid interactable down fa-circle-chevron-down" tabindex="0"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="m-b-1">
                        <h4>JSON Schema注入助手</h4>
                        <small>配置结构化输出。注意：必须遵循 SillyTavern 的包装格式。</small>
                    </div>
                    
                    <div class="m-b-1">
                        <label class="checkbox_label">
                            <input type="checkbox" id="google_schema_enabled" />
                            <span class="checkbox_text">启用结构化输出 (Enable Structured Output)</span>
                        </label>
                    </div>

                    <div class="m-b-1 flex-container">
                        <label for="google_schema_mode">配置模式:</label>
                        <select id="google_schema_mode" class="text_pole" style="max-width: 200px; margin-left: 10px;">
                            <option value="static">纯 JSON (Static)</option>
                            <option value="dynamic">动态 JavaScript (Dynamic)</option>
                        </select>
                    </div>
                    <small id="google_schema_hint" style="display:block; margin-bottom: 5px; color: #ffa500;"></small>

                    <div class="m-b-1">
                        <textarea id="google_schema_input" class="text_pole" rows="14" style="font-family: monospace; font-size: 12px;"></textarea>
                        <div id="google_schema_status" style="font-size: 0.8em; margin-top: 5px;"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const hintStatic = "必须包含 <b>name</b> 和 <b>value</b> 字段。其中 value 才是真正的 Schema。";
    const hintDynamic = "必须 <b>return</b> 一个包含 <b>name</b> 和 <b>value</b> 的对象。";

    const placeholderStatic = JSON.stringify({
        "name": "my_schema",
        "description": "描述此 schema 的用途",
        "strict": true,
        "value": {
            "type": "object",
            "properties": {
                "reply": { "type": "string" },
                "mood": { "type": "string", "enum": ["happy", "sad"] }
            },
            "required": ["reply", "mood"]
        }
    }, null, 2);

    const placeholderDynamic = `// 可用变量: lastAiJson (上一次的输出解析)\nlet currentMood = "neutral";\nif (lastAiJson && lastAiJson.mood) currentMood = lastAiJson.mood;\n\nreturn {\n    "name": "dynamic_response",\n    "strict": true,\n    "value": {\n        "type": "object",\n        "properties": {\n            "text": { "type": "string" },\n            "last_mood": { "type": "string", "const": currentMood }\n        },\n        "required": ["text", "last_mood"]\n    }\n};`;

    function updateState() {
        const textarea = document.getElementById('google_schema_input');
        const statusDiv = document.getElementById('google_schema_status');
        const checkbox = document.getElementById('google_schema_enabled');
        const modeSelect = document.getElementById('google_schema_mode');
        const hintText = document.getElementById('google_schema_hint');

        if (!textarea || !statusDiv || !checkbox || !modeSelect) return;

        const val = textarea.value;
        const mode = modeSelect.value;
        
        settings.jsonSchema = val;
        settings.enabled = checkbox.checked;
        settings.mode = mode;
        saveSettings();

        if (mode === 'static') {
            hintText.innerHTML = hintStatic;
            textarea.placeholder = placeholderStatic;
        } else {
            hintText.innerHTML = hintDynamic;
            textarea.placeholder = placeholderDynamic;
        }

        const trimmedVal = val.trim();
        if (trimmedVal === "") {
            statusDiv.textContent = "未配置内容";
            statusDiv.style.color = "grey";
            textarea.style.borderColor = "";
            return;
        }

        try {
            if (mode === 'static') {
                const parsed = JSON.parse(trimmedVal);
                if (!parsed.name || !parsed.value) {
                    throw new Error("缺少必需的 'name' 或 'value' 字段");
                }
                statusDiv.textContent = "JSON 格式正确且符合 ST 要求";
            } else {
                new Function('lastAiJson', trimmedVal);
                statusDiv.textContent = "JS 语法校验通过 (请确保 return 正确对象)";
            }
            statusDiv.style.color = "green";
            textarea.style.borderColor = "green";
        } catch (e) {
            statusDiv.textContent = "错误: " + e.message;
            statusDiv.style.color = "red";
            textarea.style.borderColor = "red";
        }
    }

    function initUI() {
        const container = $('#extensions_settings');
        if ($('#google_schema_settings_container').length > 0) return;
        
        container.append(settingsHtml);
        loadSettings();
        
        const textarea = document.getElementById('google_schema_input');
        const checkbox = document.getElementById('google_schema_enabled');
        const modeSelect = document.getElementById('google_schema_mode');
        
        if (textarea && checkbox && modeSelect) {
            textarea.value = settings.jsonSchema;
            checkbox.checked = settings.enabled;
            modeSelect.value = settings.mode;
            
            textarea.addEventListener('input', updateState);
            checkbox.addEventListener('change', updateState);
            modeSelect.addEventListener('change', updateState);
            
            updateState();
        }
    }

    jQuery(document).ready(function () {
        initUI();
    });

    // ----------- 核心注入逻辑 -----------

    function getLastAIMessageJson() {
        const context = SillyTavern.getContext();
        const chat = context.chat;
        if (!chat || !Array.isArray(chat) || chat.length === 0) return null;

        for (let i = chat.length - 1; i >= 0; i--) {
            const msg = chat[i];
            if (!msg.is_user && !msg.is_system) {
                const content = msg.mes;
                if (!content) continue;
                const cleanContent = content.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
                try {
                    return JSON.parse(cleanContent);
                } catch (e) {}
            }
        }
        return null;
    }

    // 2. 新增：递归遍历对象并替换字符串中的宏
    function processSchemaMacros(obj) {
        if (typeof obj === 'string') {
            // 预处理旧版占位符以兼容 ST 的标准宏引擎
            let text = obj.replace(/<USER>/gi, '{{user}}').replace(/<CHAR>/gi, '{{char}}');
            
            // 使用 ST 的引擎进行替换
            if (typeof substituteParams === 'function') {
                let replaced = substituteParams(text);
                
                // 防御性检查：因为某些 ST 分支中的 substituteParams 可能会因为 SlashCommand 返回数组
                if (Array.isArray(replaced)) {
                    replaced = replaced.join('');
                }
                return replaced;
            }
            return text;

        } else if (Array.isArray(obj)) {
            // 遍历数组
            return obj.map(item => processSchemaMacros(item));

        } else if (obj !== null && typeof obj === 'object') {
            // 遍历对象属性
            const newObj = {};
            for (const [key, value] of Object.entries(obj)) {
                // 注意：通常 JSON Schema 的 key 不包含宏，所以我们只处理 value
                newObj[key] = processSchemaMacros(value);
            }
            return newObj;
        }
        
        // 其他类型 (boolean, number 等) 保持原样
        return obj;
    }

    eventSource.on(event_types.CHAT_COMPLETION_SETTINGS_READY, (data) => {
        if (!settings.enabled) return;
        
        const schemaStr = settings.jsonSchema.trim();
        if (!schemaStr) return;

        let schemaObj = null;

        if (settings.mode === 'static') {
            try {
                schemaObj = JSON.parse(schemaStr);
            } catch (e) {
                console.error("[Json Schema助手] 解析失败", e);
                return;
            }
        } else if (settings.mode === 'dynamic') {
            const lastAiJson = getLastAIMessageJson();
            try {
                const dynamicBuilder = new Function('lastAiJson', schemaStr);
                schemaObj = dynamicBuilder(lastAiJson);
            } catch (err) {
                console.error("[Json Schema助手] 动态执行出错", err);
                return;
            }
        }

        // 3. 在验证并传递给 ST 前，处理 schemaObj 中的宏
        if (schemaObj && schemaObj.name && schemaObj.value) {
            
            // 递归替换宏变量
            schemaObj = processSchemaMacros(schemaObj);

            data.json_schema = schemaObj;
            console.log("[Json Schema助手] 注入成功:", schemaObj.name);
        } else if (schemaObj) {
            console.warn("[Json Schema助手] 注入跳过: 生成的对象缺少 name 或 value 字段", schemaObj);
        }
    });

})();
