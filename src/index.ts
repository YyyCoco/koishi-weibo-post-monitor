import { Context, Logger } from 'koishi'
import { Config, type Config as ConfigType } from './services/config'
import { USER_AGENT_LIST } from './services/constant'
import { setCookie, setUserAgent } from './services/cookie'
import { getWeiboAndSendMessageToGroup } from './services/message'

export const name = 'weibo-post-monitor'

export { Config }

export let logger = new Logger(name)

export function apply(ctx: Context, config: ConfigType) {
  const commonConfig = {
    account: config.account,
    plantform: config.plantform,
    waitMinutes: config.waitMinutes,
    is_using_cookie: config.is_using_cookie,
  }

  if(config.is_using_cookie){
    setCookie(config.manual_cookie)
  }
  setUserAgent(USER_AGENT_LIST[0])

  ctx.setInterval(async () => {
    for (const singleConfig of config.sendINFO) {
      const params = { ...commonConfig, ...singleConfig }
      getWeiboAndSendMessageToGroup(ctx, params)
    }
  }, config.waitMinutes > 0 ? config.waitMinutes * 60 * 1000 : 60000)
}
