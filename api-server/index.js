// const express = require('express')
// const { generateSlug } = require('random-word-slugs')
// const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs')
// const { Server } = require('socket.io')
// const Redis = require('ioredis')

// const app = express()
// const PORT = 9000

// const subscriber = new Redis('rediss://default:AVNS_FznLBb7LLAst1v_u4x0@redis-3ccc0c2f-arpantio25-7209.a.aivencloud.com:12137')

// const io = new Server({ cors: '*' })

// io.on('connection', socket => {
//     socket.on('subscribe', channel => {
//         socket.join(channel)
//         socket.emit('message', `Joined ${channel}`)
//     })
// })

// io.listen(3000, () => console.log('Socket Server 9002'))

// const ecsClient = new ECSClient({
//     region: 'ap-south-1',
//     credentials: {
//         accessKeyId: 'AKIA3U7NO2G7OW3HNBGB',
//         secretAccessKey: '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'
//     }
// })

// const config = {
//     CLUSTER: 'arn:aws:ecs:ap-south-1:800972526014:cluster/builder-cluster-1',
//     TASK: 'arn:aws:ecs:ap-south-1:800972526014:task-definition/builder-task-1:1'
// }

// app.use(express.json())

// app.post('/project', async (req, res) => {
//     const { gitURL, slug } = req.body
//     const projectSlug = slug ? slug : generateSlug()

//     // Spin the container
//     const command = new RunTaskCommand({
//         cluster: config.CLUSTER,
//         taskDefinition: config.TASK,
//         launchType: 'FARGATE',
//         count: 1,
//         networkConfiguration: {
//             awsvpcConfiguration: {
//                 assignPublicIp: 'ENABLED',
//                 subnets: ['subnet-0a3a5683081a3b5ce', 'subnet-06fbd78e3efff616b', 'subnet-00544006772a7c8e9'],
//                 securityGroups: ['sg-0e4b1f9a9d7183fd2']
//             }
//         },
//         overrides: {
//             containerOverrides: [
//                 {
//                     name: 'builder-image',
//                     environment: [
//                         { name: 'GIT_REPOSITORY__URL', value: gitURL },
//                         { name: 'PROJECT_ID', value: projectSlug }
//                     ]
//                 }
//             ]
//         }
//     })

//     await ecsClient.send(command);

//     return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } })

// })

// async function initRedisSubscribe() {
//     console.log('Subscribed to logs....')
//     subscriber.psubscribe('logs:*')
//     subscriber.on('pmessage', (pattern, channel, message) => {
//         io.to(channel).emit('message', message)
//     })
// }


// initRedisSubscribe()

// app.listen(PORT, () => console.log(`API Server Running..${PORT}`))



const express = require('express');
const { generateSlug } = require('random-word-slugs');
const { ECSClient, RunTaskCommand } = require('@aws-sdk/client-ecs');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
const PORT = 9000;

const subscriber = new Redis({
    host: 'redis-3ccc0c2f-arpantio25-7209.a.aivencloud.com',
    port: 12137,
    password: 'AVNS_FznLBb7LLAst1v_u4x0',
    tls: {}
});

const io = new Server({
    cors: {
        origin: '*'
    }
});

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel);
        socket.emit('message', `Joined ${channel}`);
    });
});

io.listen(9002, () => console.log('Socket Server Running on port 9002'));

const ecsClient = new ECSClient({
    region: 'ap-south-1',
    credentials: {
        accessKeyId: '',
        secretAccessKey: ''
    }
});

const config = {
    CLUSTER: 'arn:aws:ecs:ap-south-1:800972526014:cluster/builder-cluster-1',
    TASK: 'arn:aws:ecs:ap-south-1:800972526014:task-definition/builder-task-1:1'
};

app.use(express.json());

app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body;
    const projectSlug = slug ? slug : generateSlug();

    // Spin the container
    const command = new RunTaskCommand({
        cluster: config.CLUSTER,
        taskDefinition: config.TASK,
        launchType: 'FARGATE',
        count: 1,
        networkConfiguration: {
            awsvpcConfiguration: {
                assignPublicIp: 'ENABLED',
                subnets: ['subnet-0a3a5683081a3b5ce', 'subnet-06fbd78e3efff616b', 'subnet-00544006772a7c8e9'],
                securityGroups: ['sg-0e4b1f9a9d7183fd2']
            }
        },
        overrides: {
            containerOverrides: [
                {
                    name: 'builder-image',
                    environment: [
                        { name: 'GIT_REPOSITORY__URL', value: gitURL },
                        { name: 'PROJECT_ID', value: projectSlug }
                    ]
                }
            ]
        }
    });

    try {
        await ecsClient.send(command);
        return res.json({ status: 'queued', data: { projectSlug, url: `http://${projectSlug}.localhost:8000` } });
    } catch (error) {
        console.error('Error spinning container:', error);
        return res.status(500).json({ error: 'Failed to spin container' });
    }
});

async function initRedisSubscribe() {
    console.log('Subscribed to logs....');
    subscriber.psubscribe('logs:*');
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message);
    });
}

initRedisSubscribe();

app.listen(PORT, () => console.log(`API Server Running on port ${PORT}`));
