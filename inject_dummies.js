const https = require('https');

const names = ["Hasan", "Rahim", "Karim", "Tariq", "Arif", "Jamal", "Riaz", "Sifat", "Naim", "Faruk", "Monir", "Rashed", "Emon", "Akash", "Tushar", "Rubel", "Sohel", "Jashim", "Kamrul", "Babul"];
const avatars = ["😎", "👨", "👦", "🧔", "👱‍♂️", "👨‍🦰", "👨‍🦱", "👨‍🦳", "🤴", "🕵️‍♂️"];

const dummyUsers = {};

names.forEach((name, i) => {
    // Generate wins in descending order so they have realistic scores
    const wins = Math.floor(Math.random() * 50) + (20 - i) * 10;
    const phone = "018000000" + (i < 10 ? '0' + i : i);
    const avatar = avatars[i % avatars.length];
    
    dummyUsers[phone] = {
        name: name,
        avatar: avatar,
        profile: {
            name: name,
            avatarEmoji: avatar
        },
        stats: {
            wins: wins
        }
    };
});

const data = JSON.stringify(dummyUsers);

const options = {
    hostname: 'card-ae1f3-default-rtdb.firebaseio.com',
    port: 443,
    path: '/users.json',
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
    }
};

const req = https.request(options, (res) => {
    console.log(`statusCode: ${res.statusCode}`);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
