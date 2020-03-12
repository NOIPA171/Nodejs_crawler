# Nodejs_crawler
crawler for Node js (Telunyang after class)

# 104.js
crawl 104 info
先抓列表，再到個別頁面取得詳細資訊

# youtube.js
crawl youtube info
先抓列表，再到個別頁面取得詳細資訊

# youtube_downloader.js
download cralwed videos' video

# wine-searcher.js
curl

# threekingdoms.js
curl

# novel.js 
get 金庸 novels by book, volume and chapters

# pixiv.js
1. 搜尋關鍵字，按下「插畫」分類
2. 取得頁面作品資訊 

⋅⋅⋅執行的是`getImg()`，若有找到下一頁的箭頭，則接著執行`nextPage()`⋅⋅
⋅⋅⋅抵達下一頁再執行`getImg()`取得資訊

⋅⋅⋅以上循環直到沒有下一頁的箭頭
3. 進入每個作品的連結，取得詳細資料 

⋅⋅⋅若有多張照片，則先點擊「查看全部」，接著執行`scroll()`確定照片都有出來⋅⋅
⋅⋅⋅`scroll()`內部判定，若最後一張照片已載好，則停止滾動
