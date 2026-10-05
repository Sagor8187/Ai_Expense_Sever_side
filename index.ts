import express from 'express';
import type { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Db, MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
// config env file
dotenv.config();

const app: Express = express();
const PORT: string | number = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

const uri: string = process.env.MONGO_DB_URI || '';

if (!uri) {
  console.error("MONGO_DB_URI is missing in the .env file!");
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run(): Promise<void> {
  try {
    await client.connect();

    const database: Db = client.db("ai_expense");
    const budgetCollection = database.collection("budget");
    const incomeCollection = database.collection("income");

    // 1. POST API - Budget Save
    app.post("/all_budget", async (req: Request, res: Response) => {
      try {
        const data = req.body;

        interface Ibudget {
          category: string;
          month: string;
          amount: number;
          spent: number;
          userId: string;
          createdAt: Date;
        }

        const newBudget: Ibudget = {
          category: data.category,
          month: data.month,
          amount: Number(data.amount),
          spent: Number(data.spent || 0),
          userId: data.userId, // userId camelCase e standardized
          createdAt: new Date()
        };

        const result = await budgetCollection.insertOne(newBudget);
        res.status(201).json({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.error("Error saving budget:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
      }
    });


    // fetch api 
interface IBudgetParams {
  id: string;
}

// 2. Request Body type define
interface IUpdateSpentBody {
  spent: number;
}

// 3. API Response type define
interface IApiResponse {
  success: boolean;
  message: string;
  modifiedCount?: number;
}

// Express Route with Strict Types
app.patch(
  "/budget/:id/spent",
  async (
    req: Request<IBudgetParams, IApiResponse, IUpdateSpentBody>,
    res: Response<IApiResponse>
  ): Promise<Response> => {
    try {
      const { id } = req.params;
      const { spent } = req.body;

      // ObjectId valid kina check (server crash avoid korar jonno)
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid budget ID format"
        });
      }

      // Validation check for spent
      if (spent === undefined || typeof spent !== "number" || isNaN(spent)) {
        return res.status(400).json({
          success: false,
          message: "Valid spent amount is required"
        });
      }

      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          spent: Number(spent)
        }
      };

      const result = await budgetCollection.updateOne(filter, updateDoc);

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Budget not found"
        });
      }

      return res.status(200).json({
        success: true,
        message: "Spent updated successfully",
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      console.error("Error updating spent:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error"
      });
    }
  }
);
    // 2. GET API - Fetch Budgets (Filtered by userId)
    app.get('/all_budget', async (req: Request, res: Response) => {
      try {
        const userId = req.query.userId as string;
        const query = userId ? { userId } : {};

        const budgets = await budgetCollection.find(query).toArray();
        res.status(200).json({
          success: true,
          message: "Budgets retrieved successfully",
          data: budgets
        });
      } catch (error) {
        console.error("Error fetching budgets:", error);
        res.status(500).json({
          success: false,
          message: "Failed to fetch budgets"
        });
      }
    });




    // 1. POST API - Save Income
app.post("/all_income", async (req: Request, res: Response) => {
  try {
    const data = req.body;

    interface IIncome {
      title: string;
      amount: number;
      category: string;
      date: string;
      note?: string;
      userId?: string;
      createdAt: Date;
    }

    const newIncome: IIncome = {
      title: data.title,
      amount: Number(data.amount),
      category: data.category,
      date: data.date,
      note: data.note || "",
      userId: data.userId || "",
      createdAt: new Date()
    };

    const result = await incomeCollection.insertOne(newIncome);
    res.status(201).json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    console.error("Error saving income:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// 2. GET API - Fetch Incomes (Filtered by userId or all)
app.get('/all_income', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    const query = userId ? { userId } : {};

    const incomes = await incomeCollection.find(query).toArray();
    res.status(200).json({
      success: true,
      message: "Incomes retrieved successfully",
      data: incomes
    });
  } catch (error) {
    console.error("Error fetching incomes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch incomes"
    });
  }
});

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged deployment. Successfully connected to MongoDB!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

run().catch(console.dir);

app.get('/', (req: Request, res: Response) => {
  res.send('Server is running successfully with TypeScript!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
