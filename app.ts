import express from 'express';
import firebase from 'firebase';
import http from 'http';
import cors from 'cors';

interface CoinDeskData {
    bpi: {
        EUR: object,
        GBP: object,
        USD: object
    },
    chartname: string,
    disclaimer: string,
    time: {
        updated: string,
        updatedISO: string,
        updateduk: string
    }

}
const app = express();
const port = process.env.PORT || 3000;
app.use(cors())
app.get('/btc', (req, res) => {
    const hour = (parseInt(req.query.hour as string, 10) || 24);
    const currency = req.query.currency as string || 'EUR';
    getBtcPrice(hour).then((snapshot) => {
        const btcPrice: string[] = new Array();
        snapshot.forEach(
            (childSnapshot) => { btcPrice.push(childSnapshot.val().bpi[currency].rate_float) }
        )
        res.json(btcPrice);
    })
});
app.listen(port, () => {
    return console.log(`server is listening on ${port}`);
});

const options = {
    host: 'api.coindesk.com',
    path: '/v1/bpi/currentprice.json'
};

// Remove for production case
const firebaseConfig = {
    apiKey: "AIzaSyDeMzqrRwhIg2jtSPEAYi5Wbpq43orxRkY",
    authDomain: "kwotdemoapp.firebaseapp.com",
    databaseURL: "https://kwotdemoapp-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kwotdemoapp",
    storageBucket: "kwotdemoapp.appspot.com",
    messagingSenderId: "199001186717",
    appId: "1:199001186717:web:f925110a634ac7aca74f74"
};

firebase.initializeApp(firebaseConfig);
const btcPriceListRef = firebase.database().ref('btcPrice');

async function getBtcPrice(sinceHour: number) {
    const btcLastPrices = btcPriceListRef.limitToLast(sinceHour * 12);
    return btcLastPrices.once('value');
}

const saveResponse = (response: any) => {
    response.on('data', (msg: any) => {
        const data: CoinDeskData = JSON.parse(msg.toString());
        btcPriceListRef.push().set(
            {
                bpi: data.bpi,
                time: data.time
            },
            (error: any) => {
                if (error) {
                    // The write failed...
                    console.log("Write failed with error: " + error);
                } else {
                    // The write was successful...
                    console.log("Write success");
                }
            }
        )
    });
}

// request data and save it every 5 seconds
function refresh() {
    http.request(options, saveResponse).end();
    setTimeout(refresh, 300000);
}
// initialyze the regular polling
 setTimeout(refresh, 300000);


