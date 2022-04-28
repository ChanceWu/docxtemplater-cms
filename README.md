# docxtemplater-cms
docx generator working with templates and data


# 模板语法



## 基础用法

### 普通变量

{字段代码}

示例：{ data.param1 }

### 条件

以 **{#字符代码}** 开头，以 **{/}** 结尾

示例：{#data.params1}内容{/}

**注意**：满足条件才会显示内容，不满足条件则不会显示内容。判断条件支持等于大于小于；支持两个等号的类型隐式转换，三个等号的类型匹配；支持接受布尔值；支持获取数组可以获取 length 等属性，但无法使用 indexOf/includes 等 js 方法；