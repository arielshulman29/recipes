const axios = require("axios");
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { promisify } = require('util')
const creds = require(`./service-account.json`)
const recipes = [
    "https://www.melskitchencafe.com/fusilli-alla-caprese/",
    "https://www.melskitchencafe.com/zucchini-mozzarella-medley/",
    "https://www.melskitchencafe.com/slow-cooker-italian-beef/"
]

const getRecipeIdUrl = 'https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/extract';
let getPriceUrl = `https://spoonacular-recipe-food-nutrition-v1.p.rapidapi.com/recipes/###/priceBreakdownWidget.json`;
let recipeUrl = '';

const optionsGetId = {
    method: 'GET',
    url: getRecipeIdUrl,
    params: { url: recipeUrl },
    headers: {
        'x-rapidapi-key': '24cd8fc804mshf043c3752584e58p1c2550jsn2c46c619e593',
        'x-rapidapi-host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com'
    }
};

const optionsGetPrices = {
    method: 'GET',
    url: getPriceUrl,
    headers: {
        'x-rapidapi-key': '24cd8fc804mshf043c3752584e58p1c2550jsn2c46c619e593',
        'x-rapidapi-host': 'spoonacular-recipe-food-nutrition-v1.p.rapidapi.com'
    }
};

const getRecipe = async (rec) => {
    try {
        optionsGetId.params.url = rec;
        const recipe = await axios.request(optionsGetId)
        return recipe.data;
    } catch (err) {
        return error;
    }
}

const getRecipePrices = async (resId) => {
    try {
        optionsGetPrices.url = getPriceUrl.replace("###", resId);
        const res = await axios.request(optionsGetPrices)
        return res.data;
    } catch (err) {
        console.log(err, optionsGetPrices.url)
        return error;
    }
}


const SPREADSHEET_ID = `1ESmf0K7ykN7t_lNLkJ6F2uIJCxYRzXvdwHx0vtob61k`

const doc = new GoogleSpreadsheet(SPREADSHEET_ID)

async function accessSpreadsheet() {
    await doc.useServiceAccountAuth({
        client_email: creds.client_email,
        private_key: creds.private_key,
    });
}

async function editSheet(index, recipe, ingredients) {
    try {
        await doc.loadInfo(); // loads document properties and worksheets
        // const sheet = doc.sheetsById[438591722];
        const sheet = doc.sheetsByIndex[index];
        await sheet.updateProperties({ title: recipe.title });
        await sheet.loadCells('A1:G52');
        sheet.getCellByA1('C7').value = recipe.title;
        sheet.getCellByA1('C8').value = recipe.instructions;
        sheet.getCellByA1('C9').value = recipe.readyInMinutes;
        sheet.getCellByA1('C10').value = recipe.servings;
        sheet.getCellByA1('C39').value = recipe.readyInMinutes;
        sheet.getCellByA1('C40').value = recipe.readyInMinutes / 60;
        sheet.getCellByA1('F39').value = 0.006;
        sheet.getCellByA1('F40').value = 25;
        sheet.getCellByA1('G52').value = 2;

        for (let i = 0; i < ingredients.length; i++) {
            let sheetIndex = i + 11;
            sheet.getCell(sheetIndex, 1).value = ingredients[i].name;
            sheet.getCell(sheetIndex, 2).value = ingredients[i].amount.us.value;
            if (ingredients[i].amount.us.unit === "") {
                sheet.getCell(sheetIndex, 3).value = "unit"
            } else {
                sheet.getCell(sheetIndex, 3).value = ingredients[i].amount.us.unit;
            }
            var wastePerc = (ingredients[i].amount.us.value % 1) * 100;
            (wastePerc === 0) ? waste = (100 - wastePerc) : waste = 0;
            sheet.getCell(sheetIndex, 4).value = `${waste}%`;
            var pricePerProduct = ingredients[i].price;
            var qntyInGrams = ingredients[i].amount.metric.value;
            var byUnit = false;
            let str = '/100 gr';
            switch (ingredients[i].amount.metric.unit) {
                case 'Tbsps':
                    qntyInGrams = qntyInGrams * 17.07;
                    break;
                case 'tsp':
                    qntyInGrams = qntyInGrams * 5.69;
                    break;
                case 'kilogram':
                    qntyInGrams = qntyInGrams * 1000;
                    break;
                case 'pinch':
                    qntyInGrams = 0.0001;
                    break;
                case '':
                    byUnit = true;
                    str = 'per unit';
                    break;
            }

            pricePerProduct = ((ingredients[i].price) / qntyInGrams).toFixed(2);
            sheet.getCell(sheetIndex, 5).value = `${pricePerProduct}` + str;
            sheet.getCell(sheetIndex, 6).value = ingredients[i].price / 10;
        }
        await sheet.saveUpdatedCells();
    }
    catch (err) {
        console.log(err);
    }
}

async function main() {
    for (let i = 0; i < recipes.length; i++) {
        const rec = recipes[i];
            const recipe = await getRecipe(rec);
        if (recipe&&recipe.id>-1) {
            const { ingredients } = await getRecipePrices(recipe.id);
            await accessSpreadsheet();
            await editSheet(i + 23, recipe, ingredients);
        }
    }
}
main();
