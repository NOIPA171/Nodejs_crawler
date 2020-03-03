const util = require('util')
const fs = require('fs')
const moment = require('moment')

//將 exec 非同步化（可以用 await, .then, .catch）
const exec = util.promisify(require('child_process').exec)

//引入 jquery 機制
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const { window } = new JSDOM()
const $ = require('jquery')(window)

//瀏覽器標頭，讓對方以為我們是人類
const headers = {
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
    'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/sign ed-exchange;v=b3',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7', 
};

//放酒資料的陣列
let arrWines = []

//走訪網址
//let url = 'https://www.wine-searcher.com/find/screaming+eagle+cab+sauv+napa+valley+county+north+coast+california+usa/1992/taiwan#t3'

let arrUrl = [
    'https://www.wine-searcher.com/find/screaming+eagle+cab+sauv+napa+valley+county+north+coast+california+usa/1992/taiwan#t3',
    'https://www.wine-searcher.com/find/latour+pauillac+medoc+bordeaux+france/2006/taiwan#t3'
]

//IIFE
;(
    async function(){
        for(let url of arrUrl){
            //用 curlt, 所以 stdout 抓回的是 html
            //curl -k -X....  ==> -k : 略過 SSL 驗證
            let {stdout, stderr} = await exec(`curl -X GET ${url} -L -H "User-Agent: ${headers['User-Agent']}" -H "Accept-Language: ${headers['Accept-Language']}" -H "Accept: ${headers['Accept']}"`)

            let strChartData = "" //價格 json 文字資料
            let dataChartData = {} //將 json 轉成物件型態
            let arrMain = [] //放置價格物件的陣列
            let dateTime = "" //放置日期時間
            let price = 0 //價格

            //找出酒的名稱
            let pattern = /https:\/\/www\.wine-searcher\.com\/find\/([a-z+]+)\/(1[0-9]{3}|20[0-9]{2})\/taiwan#t3/g
            let arrMatch = null
            let strJsonFileName = '' //json檔案名稱

            if((arrMatch = pattern.exec(url)) !== null){
                /* arr match
                    [
                        'https://www.wine-searcher.com/find/screaming+eagle+cab+sauv+napa+valley+county+north+coast+california+usa/1992/taiwan#t3',
                        'screaming+eagle+cab+sauv+napa+valley+county+north+coast+california+usa',
                        '1992',
                        index: 0,
                        input: 'https://www.wine-searcher.com/find/screaming+eagle+cab+sauv+napa+valley+county+north+coast+california+usa/1992/taiwan#t3',
                        groups: undefined
                        ]
                */

                //先將 screaming+eagle+cab+sauv+napa+valley+county+north+coast+california+usa 字串帶到變數中
                strJsonFileName = arrMatch[1]
                //將字串中的 + 取代為 _
                strJsonFileName = strJsonFileName.replace(/\+/g, '_')
                //將後面的年份用 _ 接上字串
                strJsonFileName = strJsonFileName + '_' + arrMatch[2]
            }
            
            console.log(strJsonFileName);

            //取得圖表中，字串化後的物件內容
            strChartData = $(stdout).find("div#hst_price_div_detail_page").attr("data-chart-data");

            //取得 json 字串，轉成物件以方便程式使用
            dataChartData = JSON.parse(strChartData)
            arrMain = dataChartData.chartData.main
    
            for(let arr of arrMain){
                /**
                 * arr[0] => 時間戳記 => 轉成日期時間(ms -> second，要除以1000)
                 * arr[1] => 價格（預設美金）
                 */
                dateTime = moment.unix(parseInt(arr[0]) / 1000).format("YYYY-MM-DD")
                price = Math.round(arr[1]) //Math.round 在某些數值下不會幫你進位

                //console.log(`時間：${dateTime} \n價格（美金）：${price}，換算成新台幣約為 ${price * 30} NTD\n`)

                //整理資訊
                arrWines.push({
                    'dateTime': dateTime,
                    'price_us': price,
                    'price_tw': (price * 30)
                })
            }
            //console.log(arrWines)
            //儲存json
            await fs.writeFileSync(`downloads/${strJsonFileName}.json`, JSON.stringify(arrWines, null, 4))
            //初始化
            arrWines = [];
        }
    }
)()