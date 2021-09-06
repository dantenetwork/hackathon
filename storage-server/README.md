<!--
 * @Description: 
 * @Author: kay
 * @Date: 2021-08-18 10:11:43
 * @LastEditTime: 2021-08-18 10:27:03
 * @LastEditors: kay
-->

# Storage Server

## 安装环境

1.安装[Node.js](https://nodejs.org/en/)

2.安装[Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

3.安装[nodemon](https://github.com/remy/nodemon)

## 命令集(开发环境)

macOS: `npm run dev`

windows: `NODE_ENV=dev nodemon app.js`

## 部署

测试环境部署命令:

```sh
npm install -d; pm2 start develop.json
```

生产环境部署命令:

```sh
npm install -d; pm2 start production.json
```
