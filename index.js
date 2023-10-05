const express = require("express");
const { google } = require("googleapis");
const sgMail = require("@sendgrid/mail");
const PORT = process.env.PORT || 3001;
const app = express();

const stripe = require("stripe")('<SuperSecretKey>');

// CORS Policy stuff.
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
    next();
});

app.use(express.json());

app.get("/get-all-items", async (req, res) => {
    var allItems = await getAllItems();
    res.send(allItems);
});

app.get("/get-all-item-variations", async (req, res) => {
    // Authorize access to Google Sheets!
    const auth = new google.auth.GoogleAuth({
        keyFile: "GoogleSheetCredentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});
    const spreadsheetID = "1qcIY6ld3Rm9gAtI4SnlDGFkOFxrlZn0IReECnMFso9Q";

    // Get all current item variations from spreadsheet.
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetID,
        range: "Item Variations",
    });

    // The shift function removes the first row, which is the headers in the Google Sheet.
    getRows.data.values.shift();
    console.log("Requested all item variations!");
    
    res.send(getRows.data.values);
});

app.get("/get-all-comics", async (req, res) => {
    var allComics = await getAllComics();
    res.send(allComics);
});

app.get("/get-most-recent-announcements", async (req, res) => {
    // Authorize access to Google Sheets!
    const auth = new google.auth.GoogleAuth({
        keyFile: "GoogleSheetCredentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});
    const spreadsheetID = "1qcIY6ld3Rm9gAtI4SnlDGFkOFxrlZn0IReECnMFso9Q";

    // Get all current announcements from spreadsheet.
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetID,
        range: "Announcements",
    });

    // The shift function removes the first row, which is the headers in the Google Sheet.
    // The reverse function sets the page so the most recent announcement is at the top.
    getRows.data.values.shift();
    var lastThreeAnnouncements = getRows.data.values.slice(-3).reverse();
    console.log("Requested announcements!");

    res.send(lastThreeAnnouncements);
});

app.post("/check-if-order-exists", async (req, res) => {
    // Authorize access to Google Sheets!
    const auth = new google.auth.GoogleAuth({
        keyFile: "GoogleSheetCredentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});
    const spreadsheetID = "1qcIY6ld3Rm9gAtI4SnlDGFkOFxrlZn0IReECnMFso9Q";

    // Get all current orders from spreadsheet.
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetID,
        range: "Orders",
    });

    // The shift function removes the first row, which is the headers in the Google Sheet.
    getRows.data.values.shift();

    let paymentIDAlreadyExists = false;
    for (let i = 0; i < getRows.data.values.length; i++) {
        // The first value in each item in the array will be the Stripe Payment ID.
        if (getRows.data.values[i][0] === req.body.paymentID) {
            paymentIDAlreadyExists = true;
        }
    }

    res.send(paymentIDAlreadyExists);
});

app.post("/add-order-to-sheet", async (req, res) => {
    let renderedSheetValues = req.body;

    // Authorize access to Google Sheets!
    const auth = new google.auth.GoogleAuth({
        keyFile: "GoogleSheetCredentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});
    const spreadsheetID = "1qcIY6ld3Rm9gAtI4SnlDGFkOFxrlZn0IReECnMFso9Q";

    // Add order to spreadsheet for order processing.
    await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId: spreadsheetID,
        range: "Orders!A:D",
        valueInputOption: "USER_ENTERED",
        resource: {
            values: renderedSheetValues
        }
    });
    
    res.end();
});

const getAllItems = async () => {
    // Authorize access to Google Sheets!
    const auth = new google.auth.GoogleAuth({
        keyFile: "GoogleSheetCredentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});
    const spreadsheetID = "1qcIY6ld3Rm9gAtI4SnlDGFkOFxrlZn0IReECnMFso9Q";

    // Get all current items from spreadsheet.
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetID,
        range: "Items",
    });

    // The shift function removes the first row, which is the headers in the Google Sheet.
    getRows.data.values.shift();
    console.log("Requested all items!");

    return(getRows.data.values);
}

const getAllComics = async () => {
    // Authorize access to Google Sheets!
    const auth = new google.auth.GoogleAuth({
        keyFile: "GoogleSheetCredentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets",
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({version: "v4", auth: client});
    const spreadsheetID = "1qcIY6ld3Rm9gAtI4SnlDGFkOFxrlZn0IReECnMFso9Q";

    // Get all current comics from spreadsheet.
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId: spreadsheetID,
        range: "Comics",
    });

    // The shift function removes the first row, which is the headers in the Google Sheet.
    getRows.data.values.shift();
    console.log("Requested all comics!");

    return(getRows.data.values);
}

const calculateOrderAmount = async (items) => {
    var allExistingItems = await getAllItems();
    var allComics = await getAllComics();

    // Make sure what was added to the cart is associated with the right price. This should only happen when
    // they attempt to edit the HTML of the webpage or the rare instance of someone checking out while we change the price
    // of a product.
    for (let i=0; i<items.length; i++) {
        let foundItem = allExistingItems.find(element => element[0] === items[i].itemID);
        if (foundItem === undefined) {
            // Did not find it in the clothing. Now check comics.
            foundItem = allComics.find(element => element[0] === items[i].itemID);
        }

        if(foundItem !== undefined) {
            let priceFromDatabase = (parseFloat(foundItem[4].replace("$", "")) * items[i].quantity).toFixed(2);
            let priceFromCart = (parseFloat(items[i].price.replace("$", ""))).toFixed(2)
            if (priceFromCart !== priceFromDatabase) {
                console.log(`Price was supposed to be ${priceFromDatabase} but was ${priceFromCart}.`);
                // TODO: Implement error message here.
                // alert(`Prices do not reflect current values. (Price was $${priceFromCart} and is supposed to be $${priceFromDatabase})`);
                return;
            }
        } else {
            // TODO: Implement error message here.
            // alert("An item in your cart was not found to be in our inventory.");
            console.log(`Item not found in our inventory. Object: ${items[i]}`);
            return;
        }
    }

    // Since we found that everything looks accurate in the cart, we can determine the customer's total amount owed.
    let calculatedTotalAmountOwed = 0;
    for (let i=0; i<items.length; i++) {
        // We don't need to check if the items exist anymore, we know they are in our inventory. Just total up the
        // prices that we have in the database depending on what item was selected.
        let foundItem = allExistingItems.find(element => element[0] === items[i].itemID);
        if (foundItem === undefined) {
            // Did not find it in the clothing. Now check comics.
            foundItem = allComics.find(element => element[0] === items[i].itemID);
        }

        calculatedTotalAmountOwed += parseFloat(foundItem[4].replace("$", "")) * items[i].quantity;
    }

    // Stripe uses integer values, so get rid of them by multiplying by 100. Also round off any remaining decimal places.
    return Math.round(calculatedTotalAmountOwed * 100);
};

app.post("/create-payment-intent", async (req, res) => {
    let cartItems = req.body;

    let calculatedAmount = await calculateOrderAmount(cartItems);
    
    if (calculatedAmount > 0) {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: calculatedAmount,
            currency: "usd",
        });
    
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } else {
        //TODO: Implement failure here. Calculated amount was zero so either an item did not have the right
        //ID or nothing was in the cart. Both catastrophic problems.
    }
});

app.post("/send-confirmation-email", async (req, res) => {
    let renderedSheetValues = req.body;

    const sendGridAPIKey = "<SuperSecretKey>";
    sgMail.setApiKey(sendGridAPIKey);

    const msg = {
        to: renderedSheetValues[0][9],
        from: {
            name: "Blobfish Comics Inc",
            email: "noreply@blobfishcomics.com",
        },
        subject: "Order Confirmed",
        text: `Hello ${renderedSheetValues[0][7]} ${renderedSheetValues[0][8]}! We have received your order and will be putting it together shortly.
        \nWe will send you another email once we have shipped your item(s).\n\nPlease remember that we are a small business with two employees: one in high school and the other in college. It may take a few days for us to prepare your order. If you have any concerns or wish to cancel your order, please contact support@blobfishcomics.com.
        \n\nThanks for doing business with us and we hope you are looking forward to your official Blobfish Comics merchandise!\n\nOrder Confirmation: https://www.blobfishcomics.com/order-confirmation/?payment_intent=${String(renderedSheetValues[0][0])}&payment_intent_client_secret=${String(renderedSheetValues[0][1])}`,
    };

    sgMail.send(msg)
        .then((response) => {console.log("Sent an email!");})
        .catch((error) => {console.log(error); console.log(error.response.body);});
});

app.post("/send-problem-report-email", async (req, res) => {
    let reportedEmailText = req.body.emailText;
    let reportedProblemText = req.body.problemText;

    if (reportedProblemText.trim() === "") {
        res.end("Please supply a problem.");
        return;
    }

    const sendGridAPIKey = "<SuperSecretKey>";
    sgMail.setApiKey(sendGridAPIKey);

    const msg = {
        to: "support@blobfishcomics.com",
        from: {
            name: "Blobfish Comics Inc",
            email: "noreply@blobfishcomics.com",
        },
        subject: "Problem: Someone Needs Help at Blobfish Comics!",
        text: `Email: ${reportedEmailText}\n\nThe following problem was reported on your page: ${reportedProblemText}`,
    };

    sgMail.send(msg)
        .then((response) => {console.log("Sent an email!");})
        .catch((error) => {console.log("Couldn't send an email: " + error); console.log(error.response.body);});

    res.end();
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});