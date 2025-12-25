import https from 'https'
import { getCookie, setCookie, getUserAgent, setUserAgent, getRandomUserAgent, fetchCookie } from './cookie'

export async function getWeibo(config: any, callback?: any, retry: boolean = false): Promise<any> {
  const { weiboUID, is_using_cookie } = config
  if (!weiboUID) { return }

  let auto_cookie = getCookie()
  let now_user_agent = getUserAgent()

  if (!is_using_cookie && !auto_cookie) {
    const randomUserAgent = getRandomUserAgent()
    setUserAgent(randomUserAgent)
    now_user_agent = randomUserAgent
    auto_cookie = await fetchCookie()
    setCookie(auto_cookie)
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
    "user-agent": now_user_agent || ''
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
              const randomUserAgent = getRandomUserAgent()
              setUserAgent(randomUserAgent)
              const newCookie = await fetchCookie()
              setCookie(newCookie)
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

