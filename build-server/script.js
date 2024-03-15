const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const mime = require('mime-types')
const Redis = require('ioredis')

const publisher = new Redis('rediss://default:AVNS_FznLBb7LLAst1v_u4x0@redis-3ccc0c2f-arpantio25-7209.a.aivencloud.com:12137')

const s3Client = new S3Client({
    region : "ap-south-1",
    credentials:{
        accessKeyId: '',
        secretAccessKey: ''
    },
    
})

const PROJECT_ID = process.env.PROJECT_ID



// async function init(){
//     console.log("Executing script.js")
//     const outDirPath = path.join(__dirname, 'output')
//     const p = exec(`cd ${outDirPath} && npm install && npm run build`)

//     p.stdout.on('data',function(data){
//         console.log(data.toString())
//     })

//     p.stdout.on('error',function(data){
//         console.log('Error',data.toString())
//     })

//     p.on('close',async function(){
//         console.log("Build Complete")
//         const distFolderPath = path.join(__dirname, 'output','dist')
//         const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

//         for(const filePath of distFolderContents){
//             if(fs.lstatSync(filePath).isDirectory()) continue;

//             console.log('Uploading',filePath)

//             const command = new PutObjectCommand({
//                 Bucket:'netlify-clone-1',
//                 Key:`__outputs/${PROJECT_ID}/${filePath}`,
//                 Body:fs.createReadStream(filePath),
//                 ContentType:mime.lookup(filePath)
//             })

//             await s3Client.send(command)
//             console.log('Uploaded',filePath)
//         }

//         console.log('Deployment Complete')
//     })
// }


function publishLog(log) {
    publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }))
}

async function init() {
    console.log('Executing script.js')
    publishLog('Build Started...')
    const outDirPath = path.join(__dirname, 'output')

    const p = exec(`cd ${outDirPath} && npm install && npm run build`)

    p.stdout.on('data', function (data) {
        console.log(data.toString())
        publishLog(data.toString())
    })

    p.stdout.on('error', function (data) {
        console.log('Error', data.toString())
        publishLog(`error: ${data.toString()}`)
    })

    p.on('close', async function () {
        console.log('Build Complete')
        publishLog(`Build Complete`)
        const distFolderPath = path.join(__dirname, 'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

        publishLog(`Starting to upload`)
        for (const file of distFolderContents) {
            const filePath = path.join(distFolderPath, file)
            if (fs.lstatSync(filePath).isDirectory()) continue;

            console.log('uploading', filePath)
            publishLog(`uploading ${file}`)

            const command = new PutObjectCommand({
                Bucket: 'netlify-clone-1',
                Key: `__outputs/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filePath),
                ContentType: mime.lookup(filePath)
            })

            await s3Client.send(command)
            publishLog(`uploaded ${file}`)
            console.log('uploaded', filePath)
        }
        publishLog(`Done`)
        console.log('Done...')
    })
}

init()