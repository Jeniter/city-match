# 你和中国哪座城市最匹配

一个手机端的趣味测试网站：24 道题、8 个维度、24 座城市，最后给出图文结果页和分享海报。

## 怎么改内容

所有文案都在 `content/` 文件夹里，改完运行 `npm run build`，再推送到 GitHub，网站一两分钟后就会更新。

| 想改什么 | 改哪个文件 |
| --- | --- |
| 题目和选项 | `content/city/questions.json` |
| 某座城市的结果文案 | `content/city/profiles/<城市>.json` |
| 城市的维度分值、主题色 | `content/city/cities.json` |
| “更懂你一点”“为什么是这座城”里的句子 | `content/city/dims.json` |
| 小红书号、免责声明 | `content/site.json`（`handle` 填 `@你的号`，留空则分享图不显示） |

## 常用命令

```sh
npm run preview   # 构建并在 http://localhost:8080 本地预览
npm run check     # 检查城市文案的字段和字数
npm test          # 检查计分是否正常（每座城都能被测出、结果分布均匀）
```

网站文件在 `docs/` 文件夹里，通过 GitHub Pages 从 `main` 分支的 `/docs` 发布。
