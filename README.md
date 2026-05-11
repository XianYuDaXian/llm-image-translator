# LLM图片翻译助手

这是一个可直接通过 Chrome / Edge “加载已解压的扩展程序”方式运行的 `Manifest V3` 浏览器扩展。

英文名：`LLM image translator`  
中文名：`LLM图片翻译助手`  
仓库名：`llm-image-translator`

Chrome 商店：`https://chromewebstore.google.com/detail/llm-image-translator/pgabkmcliemlpgjdkppcecnlkjiicjcg`  
项目主页：`https://xianyudaxian.github.io/llm-image-translator/`  
隐私政策：`https://xianyudaxian.github.io/llm-image-translator/privacy.html`

## 已实现能力

- 页面图片悬浮时显示“翻译图片”按钮
- 调用 OpenAI-compatible API 翻译图片并原位替换
- 支持 `responses`、`images`、`chat`、`custom` 四种端点模式
- 设置页提供基础连通测试、真实图片翻译测试、自动探测推荐配置
- 设置页直接展示 `testimage.png` 原图与翻译结果
- 支持当前视口批量翻译、任务侧边栏、恢复原图

## 界面截图

![设置界面](./asset/%E8%AE%BE%E7%BD%AE%E7%95%8C%E9%9D%A2.png)
![翻译效果](./asset/%E7%BF%BB%E8%AF%91%E6%95%88%E6%9E%9C.png)
![翻译对比原图](./asset/%E7%BF%BB%E8%AF%91%E5%AF%B9%E6%AF%94%E5%8E%9F%E5%9B%BE.png)
![排除图片或网站](./asset/%E6%8E%92%E9%99%A4%E5%9B%BE%E7%89%87%E6%88%96%E7%BD%91%E7%AB%99.png)

## 使用方式

1. 打开浏览器扩展管理页
2. 开启“开发者模式”
3. 选择“加载已解压的扩展程序”
4. 选择当前目录：`C:\Users\xianyu\Documents\New project`
5. 打开扩展设置页，填写 API 配置并先执行测试
6. 在网页内将鼠标悬浮到图片上，点击“翻译图片”

## 说明

- 首版只处理 `<img>` 图片
- `chat` 端点只有在上游支持“图片输入 + 图片输出”时才可用于正式翻译
- relay 模式当前只保留客户端适配入口，不包含后端实现

## 致谢

特别致谢：[LINUX DO](https://linux.do)
