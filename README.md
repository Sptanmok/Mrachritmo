# Etmucis

一个支持卡拉ok和逐字（或词）淡入淡出效果的Web字幕音乐播放器音乐库

可通过网易云歌单自动部署

可按T键切换歌词显示模式

默认包含了一些歌曲和歌词

## 部署要求

NodeJS>=20（完整的ES6模块支持，File API及现代JavaScript语法等）

## Demo演示

云模式：https://emnasop.cn/dist/

本地模式：https://music.emnasop.cn/

## 效果

目前共有三种效果，默认随机

### 卡拉OK(较大众)

万能模式，可读性最好

![](./previewgif/1xg1.gif)

![](./previewgif/2xg1.gif)

### 淡出淡入(较小众)

适合逐个字的意音/音节文字（如中文，日语，韩语），以及逐个词的音位文字（如英语，俄语），不适合逐个字的音位文字（如英语，俄语），以及快节奏歌词

![](./previewgif/1xg2.gif)

![](./previewgif/2xg2.gif)

### 随机淡出淡入(由上衍生而来)

接近万能。

![](./previewgif/3xg3.gif)

两个歌曲分别是祖海的《为了谁》，Joy Division的《Love Will Tear Us Apart》和Дела Поважнее的《Лекарство от боли》

## 搭建

### 本地模式

在src/musicfile目录放入音乐音频文件，并放入同名（不包含扩展名）的lrc增强版歌词文件

并输入

```
npm run build
```

构建

此时网站应构建成功，根目录输出在dist文件夹

### 云音乐模式

在neteaseplaylist.txt中添加你的网易云音乐歌单链接或id（一行一个）

然后输入

```
npm run 163musicbuild
```

即可

会优先通过网易云音乐获取歌词，如果没有逐词会尝试使用QQ音乐歌词



如果出现错误Error: You installed esbuild for another platform than the one you're currently using.

则您需要输入命令

```
npm rebuild esbuild
```

来重新安装esbuild依赖

## 在你的网站内使用

在网站内引用JS（在html audio以及文本元素之后，频谱条也一样）

```html
<script src="player.js"></script>
```

你需要确保你的网站包含以下css

```css
.lyric span {
    display: inline-block;
    background: linear-gradient(to right, #000000 var(--progress, 0%), #818282 var(--progress, 0%));
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    transition: --progress 0.1s ease;
	white-space: normal;
}
/*#000000与#818282分别是播放完与未播放的文字颜色*/
```

html

audio标签示例格式

```html
<audio id="audio" src="你的音乐文件路径" controls="" lyricpath="你的json歌词文件路径"></audio>
```

你需要在需要显示歌词的html文字标签使用id:lyric

并且包含class:lyric

副歌词（双语歌词）使用id:pairlyric

如果你想要实现频谱条效果，可以创建canvas
```html
<canvas id="spectrum" width="自定义" height="自定义"></canvas>
```

## 鸣谢

[LxgwWenKai](https://github.com/lxgw/LxgwWenKai)等提供美观的字体

API提供：~~music.163.com~~，meting.qjqq.cn>[Meting-API](https://github.com/injahow/meting-api)=>api.qijieya.cn/meting，api.vkeys.cn/v2/music/tencent/>[落月API - QQMusic](https://doc.vkeys.cn/)(2025\12\28报告目前存在偶尔请求出现502错误，求作者修复呜)

QQ音乐备用API修改于项目[QRCD - xmcp](https://github.com/xmcp/QRCD)

所有指点/指导的人,包括但不限于：[RainView](https://github.com/RainView-ovo),[LeonspaceX](https://github.com/LeonspaceX),[Silvaire-qwq](https://github.com/silvaire-qwq),[Mio](https://mioical.moe/),[LYXOfficial](https://github.com/LYXOfficial),[Android-KitKat](https://github.com/Android-KitKat),[Ariasaka](https://github.com/LYXOfficial)

所包含的歌曲制作人


