# ST-JsonSchemaHelper
Json Schema助手插件，使酒馆支持通过纯Json Schema格式或Javascript代码形式注入Json Schema实现结构化输出。

## 注意事项
本功能基于SillyTavern原生的[结构化输出API](https://github.com/SillyTavern/SillyTavern/pull/4272)，兼容多种API形式，但使用前请确认所使用的API是否支持结构化输出功能。

## 编写指示

### 纯Json Schema模式
编写Json Schema应该注意SillyTavern的要求，例如对于如下输出格式：

```json
{
    "reply":"回复内容。。。",
    "mood":"happy"
}
```
"reply"为回复内容，"mood"的为["happy", "sad"]二选一的心情，其对应的Json Schema应该是：

```json
{
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
}
```
具体支持的Json架构请阅读例如 [Gemini API 文档](https://ai.google.dev/gemini-api/docs/structured-output?hl=zh-cn&example=recipe#json_schema_support)

建议自行搜索使用可视化的Json Schema编辑器（可视化编辑可能无法使用anyOf、oneOf），并记得在最后额外添加一次层嵌套，编辑得到的Json Schema放入"value"的键值中并添加"name"键值对。

### 动态JavaScript模式
为满足SillyTavern的Json Schema注入要求，其原始Json Schema格式存放在value键值中，最外层的"name"、"descriptin"、"strict"并不会实际传递给大模型API，因此请勿在最外层的description中撰写角色卡内容。

本插件也支持使用Javascript代码动态修改Json Schema，要使用本功能请切换到"动态JavaScript"模式，此时可以变量lastAiJson来调用上一次AI回复的Json内容。例如：

```javascript
let currentMood = "happy";
if(lastAiJson && lastAiJson.mood) currentMood = lastAiJson.mood;
return {
    "name": "my_schema",
    "description": "描述此 schema 的用途",
    "strict": true,
    "value": {
        "type": "object",
        "properties": {
            "reply": {
                "type": "string"
            },
            "mood": {
                "type": "string",
                "enum": ["happy", "sad"],
                "description":`这里填写角色本回合的心情，上回合的心情为：${currentMood}`
            }
        },
        "required": ["reply", "mood"]
    }
}
```
通过如上形式实现JsonSchema动态修改。

## ToDo
- [ ] 读取世界书指定条目
