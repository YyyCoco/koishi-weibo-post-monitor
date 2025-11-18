import { Context, Schema } from 'koishi'
import https from 'https'


export const name = 'weibo-post-monitor'

export interface Config {
  account: string,
  plantform: string,
  waitMinutes: number,
  sendINFO: any,
}

export const Config: Schema<Config> = Schema.object({
  account: Schema.string().description("账号(qq号)"),
  plantform: Schema.string().default("onebot").description("账号平台"),
  waitMinutes: Schema.number().default(3).min(1).description("隔多久拉取一次最新微博 (分钟)"),
  sendINFO: Schema.array(Schema.object({
    weiboUID: Schema.string().description("微博用户UID"),
    forward: Schema.boolean().default(false).description("是否监听转发"),
    keywords: Schema.string().description("关键词(多个关键词用分号分隔)"),
    groupID: Schema.string().description("需要发送的群组"),
    sendAll: Schema.boolean().default(false).description("@全体成员"),
  })).description("监听&发送配置"),
})

export function to<T, U = Error>(
  promise: Promise<T>,
  errorExt?: object
): Promise<[U, undefined] | [null, T]> {
  return promise
    .then<[null, T]>((data: T) => [null, data])
    .catch<[U, undefined]>((err: U) => {
      if (errorExt) {
        const parsedError = Object.assign({}, err, errorExt);
        return [parsedError, undefined];
      }
      return [err, undefined];
    });
}
export function apply(ctx: Context, config: Config) {
  const commonConfig = {
    account: config.account,
    plantform: config.plantform,
    waitMinutes: config.waitMinutes,
  }
  ctx.setInterval(async () => {
    for (const singleConfig of config.sendINFO) {
      const params = { ...commonConfig, ...singleConfig }
      getWeiboAndSendMessageToGroup(ctx, params)
    }
  }, config.waitMinutes > 0 ? config.waitMinutes * 60 * 1000 : 60000)
}

const getWeiboAndSendMessageToGroup = async (ctx: Context, params: any) => {
  const [err, res] = await to(getWeibo(params))
  if (err) { ctx.logger.error(err); return }
  const data = res.data || {}
  const weiboList = data.list || []
  const result = getLastPost(params, weiboList)
  if (!result) { return }
  let message = result
  if (params.sendAll) {
    message = '<at id="all"/> ' + message
  }
  ctx.bots[`${params.plantform}:${params.account}`].sendMessage(params.groupID, message)
}

const getMessage = (params: any, wbPost: any): { post: string, islast: boolean } | null => {
  if (!wbPost) { return null }
  const { created_at, user } = wbPost
  const time = parseDateString(created_at)
  const lastCheckTime = Date.now() - (params.waitMinutes > 0 ? params.waitMinutes * 60 * 1000 : 60000)
  if (time.getTime() < lastCheckTime) {
    return null
  }
  const screenName = user?.screen_name || ''
  let weiboType = -1
  //获取微博类型0-视频，2-图文,1-转发微博
  if ('page_info' in wbPost) { weiboType = 0 }
  if ('pic_infos' in wbPost) { weiboType = 2 }
  if ('topic_struct' in wbPost || 'retweeted_status' in wbPost) { weiboType = 1 }
  let message = ''
  let keywordsList = params.keywords?.split(';') || []
  if (weiboType == 0) {
    const pageInfo = wbPost?.page_info
    if (!pageInfo) { return null }
    const objType = pageInfo?.object_type || ''
    if (objType == 'video') {
      const text = wbPost?.text_raw || ''
      const video = pageInfo?.media_info?.h5_url || ''
      message += (screenName + " 发布了微博:\n" + text + "\n" + video) || ''
    }
  }
  if (weiboType == 1) {
    if (params.forward) {
      message += (screenName + " 转发了微博:\n" + wbPost?.text_raw || '')
    }
  }
  if (weiboType == 2) {
    const text = wbPost?.text_raw || ''
    const picIds = wbPost?.pic_ids || []
    const picInfos = wbPost?.pic_infos || {}
    const firstPicUrl = picInfos?.[picIds[0]]?.large?.url || ''
    const picture = `<img src="${firstPicUrl}"/>`
    message += (screenName + " 发布了微博:\n" + text + "\n" + picture) || ''
  }
  const mid = wbPost?.mid || ''
  const url = `\n链接：https://m.weibo.cn/status/${mid}`
  if (keywordsList.length > 0) {
    let hasKeywords = false
    for (const keyword of keywordsList) {
      if (message.includes(keyword)) {
        hasKeywords = true
        break
      }
    }
    if (!hasKeywords) {
      return null
    }
  }
  const wbpost = message ? message + url : (screenName + " 发布了微博:\n" + wbPost?.text_raw + url) || ''
  return { post: wbpost, islast: true }
}

const getWeibo = async (config: any, callback?: any): Promise<any> => {
  const { weiboUID } = config
  if (!weiboUID) { return }
  const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "cache-control": "no-cache",
    "cookie": "XSRF-TOKEN=mgVY3WMp8U-T6Wbu24ifdazm; SUBP=0033WrSXqPxfM72-Ws9jqgMF55529P9D9WhizH8r9Hyn870HzJo4TQoB; SUB=_2AkMSf_1df8NxqwJRmfATxWrlaIV_ywjEieKkIwyGJRMxHRl-yj8XqksbtRB6Of_Tsj1wFglssEkNvyqikP19B0UlIrd8; WBPSESS=NcA3pTjBP9SOtpsXaAXWlx_1aL3IfVadLkk5h-hKiZrhJi_NyNc2r5RbB0ZE0gYuG6ZSJmF8k26JJ46ltyme0fAcMSF9VPonnDU1TPvBjVADJPPa99vi0TVPQDCUKIMU",
    "referer": "https://passport.weibo.com/",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    "x-xsrf-token": "mgVY3WMp8U-T6Wbu24ifdazm"
  }
  const options = {
    hostname: "weibo.com",
    path: "/ajax/statuses/mymblog?uid=" + weiboUID,
    method: "GET",
    headers: headers
  }
  return new Promise((resolve, reject) => {
    https.get(options, (res) => {
      let body = ""
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        try {
          const returnData = JSON.parse(body);
          callback?.(returnData)
          resolve(returnData)
        } catch (error) {
          reject({ error, body })
        }
      })
      res.on('error', (error) => {
        reject({ error, body })
      })
    })
  })

}

const parseDateString = (dateString) => {
  // 定义正则表达式解析自定义时间格式
  // 正则表达式解析时间字符串
  const regex = /(\w+) (\w+) (\d+) (\d+):(\d+):(\d+) ([+-]\d{4}) (\d{4})/;
  const match = dateString.match(regex);

  if (!match) {
    throw new Error("Invalid date format");
  }

  const [, , month, day, hour, minute, second, timezone, year] = match;

  // 月份映射
  const monthMap = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };

  // 创建UTC时间
  const date = new Date(Date.UTC(year, monthMap[month], day, hour, minute, second));

  // 处理时区偏移（例如 +0800）
  const timezoneOffsetHours = parseInt(timezone.slice(0, 3), 10);
  const timezoneOffsetMinutes = parseInt(timezone.slice(0, 1) + timezone.slice(3), 10);
  const timezoneOffset = timezoneOffsetHours * 60 + timezoneOffsetMinutes;

  // 调整时间为本地时区
  date.setUTCMinutes(date.getUTCMinutes() - timezoneOffset);

  return date;
}

const getLastPost = (params: any, weiboList: any) => {
  for (const wb_element of weiboList) {
    const result = getMessage(params, wb_element)
    if (!result) { continue }
    if (result.islast) { return result.post }
  }
  return null
}