import qqMusic from 'qq-music-api';

qqMusic.api('search', { key: '周杰伦' })
    .then(res => console.log(res))
    .catch(err => console.log('接口调用出错'))

qqMusic.api('search', { key: '周杰伦' })
    .then((res) => console.log('搜索周杰伦：', res))
    .catch(err => console.log('接口调用出错'))

qqMusic.api('search/hot')
    .then((res) => console.log('热搜词：', res))
    .catch(err => console.log('接口调用出错'))//

// 刷新登陆
qqMusic.api('user/refresh')