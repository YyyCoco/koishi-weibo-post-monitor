import { Schema } from 'koishi'

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

