import { Context, h, Schema } from 'koishi'
import https from 'https'
import axios from 'axios'


export const name = 'weibo-post-monitor'

var auto_cookie = null
var now_user_agent = null
const user_agent_list = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.105 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.71 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.187 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.7267.799 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.4907.884 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.6562.41 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2276.302 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.5174.848 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.4662.897 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.8759.750 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.9383.882 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.7253.966 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.3909.697 Safari/537.36 Edge/13.10586",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.85 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.130 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.199 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.139 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.118 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.5938.149 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.5845.140 Safari/537.36"
]

export interface Config {
  account: string,
  plantform: string,
  waitMinutes: number,
  sendINFO: any,
  is_using_cookie: boolean,
  manual_cookie: string,
}

export const Config: Schema<Config> = Schema.object({
  account: Schema.string().description("账号(qq号)"),
  plantform: Schema.string().default("onebot").description("账号平台"),
  waitMinutes: Schema.number().default(3).min(1).description("隔多久拉取一次最新微博 (分钟)"),
  is_using_cookie: Schema.boolean().default(false).description("是否启用输入cookie"),
  manual_cookie: Schema.string().default("").description("输入cookie"),
  sendINFO: Schema.array(Schema.object({
    weiboUID: Schema.string().description("微博用户UID"),
    forward: Schema.boolean().default(false).description("是否监听转发"),
    blockwords: Schema.string().description("屏蔽词(多个屏蔽词用分号分隔)"),
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
    is_using_cookie: config.is_using_cookie,
  }

  auto_cookie = config.manual_cookie
  now_user_agent = user_agent_list[0]

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
    message = h.at('all') + ' ' + message
  }
  ctx.bots[`${params.plantform}:${params.account}`].sendMessage(params.groupID, message)
  console.log(message)
}

const getLastPost = (params: any, weiboList: any) => {
  for (const wb_element of weiboList) {
    const result = getMessage(params, wb_element)
    if (!result) { continue }
    if (result.islast) { return result.post }
  }
  return null
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
    const picture = h.image(firstPicUrl)
    message += (screenName + " 发布了微博:\n" + text + "\n" + picture) || ''
  }
  const mid = wbPost?.mid || ''
  const url = `\n链接：https://m.weibo.cn/status/${mid}`
  if (!checkWords(params, wbPost?.text_raw)) { return null }
  const wbpost = message ? message + url : (screenName + " 发布了微博:\n" + wbPost?.text_raw + url) || ''
  return { post: wbpost, islast: true }
}

const getWeibo = async (config: any, callback?: any, retry: boolean = false): Promise<any> => {
  const { weiboUID, is_using_cookie } = config
  if (!weiboUID) { return }

  if (!is_using_cookie && !auto_cookie) {
    now_user_agent = user_agent_list[Math.floor(Math.random() * user_agent_list.length)]
    auto_cookie = await getCookie()
  }

  if (!auto_cookie) {
    throw new Error("Cookie config is null, please check the config");
  }

  const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "cache-control": "no-cache",
    "cookie": auto_cookie,
    "referer": "https://www.weibo.com/u/" + weiboUID,
    "user-agent": now_user_agent
  }
  const options = {
    hostname: "www.weibo.com",
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
      res.on('end', async () => {
        try {
          const returnData = JSON.parse(body);
          callback?.(returnData)
          resolve(returnData)
        } catch (error) {
          // 解析失败时，如果还没有重试过且不是使用手动cookie，则更新cookie后重试一次
          if (!retry && !is_using_cookie) {
            try {
              now_user_agent = user_agent_list[Math.floor(Math.random() * user_agent_list.length)]
              auto_cookie = await getCookie()
              // 重新请求一次
              const retryResult = await getWeibo(config, callback, true)
              resolve(retryResult)
            } catch (retryError) {
              reject({ error, body, retryError })
            }
          } else {
            reject({ error, body })
          }
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

const checkWords = (params: any, message: string): boolean => {
  if (message == null)
    return false
  let keywordsList = params.keywords?.split(';') || []
  let blockwordsList = params.blockwords?.split(';') || []
  if (keywordsList.length > 0) {
    let hasKeywords = false
    for (const keyword of keywordsList) {
      if (message.includes(keyword)) {
        hasKeywords = true
        break
      }
    }
    if (!hasKeywords) {
      return false
    }
  }
  if (blockwordsList.length > 0) {
    let hasBlockwords = false
    for (const blockword of blockwordsList) {
      if (message.includes(blockword)) {
        hasBlockwords = true
        break
      }
    }
    if (hasBlockwords) {
      return false
    }
  }
  return true
}

const mergeCookies = (cookies: string[]): string => {
  return cookies.map(c => c.split(';')[0]).join('; ')
}

const getCookie = async (): Promise<string> => {
  const commonHeaders = {
    'user-agent': now_user_agent,
    'accept': '*/*',
    'origin': 'https://passport.weibo.com',
    'referer': 'https://passport.weibo.com/visitor/visitor'
  }

  let allCookies: string[] = []

  const step1Response = await axios.post('https://passport.weibo.com/visitor/genvisitor2', 'cb=visitor_gray_callback&ver=20250916&request_id=fb15e537349aef3542ed130a47d48eb8&tid=&from=weibo&webdriver=false&rid=01by624JxwbmsPak-53wiC9LGhR6I&return_url=https://weibo.com/', {
    headers: {
      ...commonHeaders,
      'content-type': 'application/x-www-form-urlencoded'
    },
    responseType: 'text'
  })

  const step1SetCookies = step1Response.headers['set-cookie'] || []
  allCookies.push(...step1SetCookies)

  const step1Body = step1Response.data
  let visitorId: string = ''
  try {
    const jsonMatch = step1Body.match(/visitor_gray_callback\s*\(\s*({[\s\S]*})\s*\)/)
    if (!jsonMatch || !jsonMatch[1]) {
      throw new Error('无法从响应中提取 JSON 对象')
    }

    const step1Data = JSON.parse(jsonMatch[1])
    visitorId = step1Data?.data?.tid || ''
    if (!visitorId) {
      throw new Error('未获取到 visitor id，响应数据: ' + JSON.stringify(step1Data))
    }
  } catch (error) {
    throw new Error('解析 genvisitor2 响应失败: ' + error.message + ', 响应体: ' + step1Body)
  }

  const step2Response = await axios.get(`https://passport.weibo.com/visitor/visitor?a=incarnate&t=${encodeURIComponent(visitorId)}`, {
    headers: {
      ...commonHeaders,
      'cookie': mergeCookies(allCookies)
    },
    responseType: 'text'
  })

  const step2SetCookies = step2Response.headers['set-cookie'] || []
  allCookies.push(...step2SetCookies)

  return mergeCookies(allCookies)
}
