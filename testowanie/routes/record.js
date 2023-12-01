const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');


router.get('/products', async (req, res) => {
    try {
        const collection = req.app.locals.productsCol;
        let query = {};
        
        // Pobieranie parametrów z zapytania
        const { id, nazwa, cena, opis, ilość, jednostka_miary, sort } = req.query;
        
        // Tworzenie obiektu z parametrami zapytania, które chcemy filtrować
        if (nazwa) { query.nazwa = nazwa; }
        if (cena) { query.cena = parseFloat(cena); }
        if (ilość) { query.ilość = parseInt(ilość); }
        if (id) { query._id = new ObjectId(id); }
        if (opis) { query.opis = opis; }
        if (jednostka_miary) { query.jednostka_miary = jednostka_miary; }
        
        let sortQuery = {};
        if (sort) {
            const [field, order] = sort.split(':');
            sortQuery[field] = order === 'desc' ? -1 : 1;
        }
        
        // Pobieranie produktów z uwzględnieniem filtrowania i sortowania
        const products = await collection.find(query).sort(sortQuery).toArray();

        if (products.length == 0) { 
            return res.status(404).json('Nie znaleziono produktu o podanych parametrach');
        }
        res.json(products); // Wyślij produkty jako odpowiedź w formacie JSON
    } catch (err) {
        console.error('Błąd pobierania produktów:', err);
        res.status(500).json({ message: 'Wystąpił błąd podczas pobierania produktów' });
    }
});
router.get('/inventory/report', async (req, res) => {
    try {
        const collection = req.app.locals.productsCol;
        
        const inventoryReport = await collection.aggregate([
            {
                $project: {
                    _id: 0,
                    nazwa: 1,
                    ilość: 1,
                    łączna_wartość: { $multiply: ['$cena', '$ilość'] }
                }
            }
        ]).toArray();
        
        if (inventoryReport.length === 0) {
            return res.status(404).json({ message: 'Brak danych do raportu' });
        }
        
        const totalProducts = inventoryReport.length;
        const totalValue = inventoryReport.reduce((acc, product) => acc + product.wartość, 0);
        
        res.json({ products: inventoryReport, totalProducts, totalValue }); // Zwróć raport
    } catch (err) {
        console.error('Błąd generowania raportu:', err);
        res.status(500).json({ message: 'Wystąpił błąd podczas generowania raportu' });
    }
});


router.post('/products', async (req, res) => {
    try {
        const collection = req.app.locals.productsCol;
        const { nazwa, cena, opis, ilość, jednostka_miary } = req.body;
        
        // Sprawdzenie, czy wszystkie wymagane pola są dostarczone
        if (!nazwa || !cena || !opis || !ilość || !jednostka_miary) {
            return res.status(400).json({ message: 'Brak wymaganych pól' });
        }
        
        // Sprawdzenie, czy nie ma żadnych dodatkowych pól
        const allowedFields = ['nazwa', 'cena', 'opis', 'ilość', 'jednostka_miary'];
        const extraFields = Object.keys(req.body).filter(field => !allowedFields.includes(field));
        if (extraFields.length > 0) {
            return res.status(400).json({ message: 'Niedozwolone pola' });
        }
        
        // Sprawdzenie, czy cena i ilość są liczbami dodatnimi
        if (isNaN(parseFloat(cena)) || cena <= 0 || isNaN(parseInt(ilość)) || ilość < 0) {
            return res.status(400).json({ message: 'Nieprawidłowe wartości liczbowe' });
        }
        
        // Sprawdzenie, czy nazwa produktu jest unikalna
        const existingProduct = await collection.findOne({ nazwa });
        if (existingProduct) {
            return res.status(400).json({ message: 'Nazwa produktu już istnieje' });
        }
        
        // Dodanie nowego produktu do bazy danych
        const result = await collection.insertOne({ nazwa, cena, opis, ilość, jednostka_miary });
        
        // Zwrócenie odpowiedzi potwierdzającej dodanie produktu
        res.status(201).json({ message: 'Produkt został dodany', productId: result.insertedId });
    } catch (err) {
        console.error('Błąd dodawania produktu:', err);
        res.status(500).json({ message: 'Wystąpił błąd podczas dodawania produktu' });
    }
});

router.put('/products/:id', async (req, res) => {
    try {
        const collection = req.app.locals.productsCol;
        const productId = req.params.id;
        const { nazwa, cena, opis, ilość, jednostka_miary } = req.body;
        
        // Sprawdzenie, czy wszystkie wymagane pola są dostarczone
        if (!nazwa && !cena && !opis && !ilość && !jednostka_miary) {
            return res.status(400).json({ message: 'Nie wysłano żadnych danych do edycji lub nazwa danych do edycji jest niepoprawna - wybierz spośród aktualnych parametrów produktów' });
        }
        
        // Sprawdzenie, czy produkt istnieje
        const existingProduct = await collection.findOne({ _id: new ObjectId(productId) });
        if (!existingProduct) {
            return res.status(404).json({ message: 'Produkt nie istnieje' });
        }
        
        // Aktualizacja danych produktu
        const updateFields = {};
        if (nazwa) { updateFields.nazwa = nazwa; }
        if (cena) { updateFields.cena = parseFloat(cena); }
        if (opis) { updateFields.opis = opis; }
        if (ilość) { updateFields.ilość = parseInt(ilość); }
        if (jednostka_miary) { updateFields.jednostka_miary = jednostka_miary; }
        
        // Aktualizacja produktu w bazie danych
        await collection.updateOne({ _id: new ObjectId(productId) }, { $set: updateFields });
        
        res.json({ message: 'Produkt został zaktualizowany' });
    } catch (err) {
        console.error('Błąd edycji produktu:', err);
        res.status(500).json({ message: 'Wystąpił błąd podczas aktualizowania produktu' });
    }
});

router.delete('/products/:id', async (req, res) => {
    try {
        const collection = req.app.locals.productsCol;
        const productId = req.params.id;

        // Sprawdź, czy produkt istnieje
        const existingProduct = await collection.findOne({ _id: new ObjectId(productId) });
        if (!existingProduct) {
            return res.status(404).json({ message: 'Produkt nie istnieje' });
        }

        // Sprawdź czy produkt jest na magazynie
        if (existingProduct.ilość = 0) {
            return res.status(400).json({ message: 'Produkt nie jest dostępny na magazynie' });
        }

        // Usuń produkt
        const deleteResult = await collection.deleteOne({ _id: new ObjectId(productId) });
        if (deleteResult.deletedCount === 0) {
            return res.status(500).json({ message: 'Nie udało się usunąć produktu' });
        }

        res.json({ message: 'Produkt został pomyślnie usunięty' });
    } catch (err) {
        console.error('Błąd usuwania produktu:', err);
        res.status(500).json({ message: 'Wystąpił błąd podczas usuwania produktu' });
    }
});


module.exports = router;