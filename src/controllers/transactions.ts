import { Response } from "express";
import { z } from "zod";
import knex from "../database/dbConnect";
import { MyReq } from "../types";
import { bodyNewTransaction } from "../validation/schemaTransactions";
import { TransactionModel } from "../models/transactions";
import { CategoryModel } from "../models/categories";

export const listTransactions = async (req: MyReq, res: Response) => {
  const userId = req.userData?.id;
  try {
    const userTransactions: TransactionModel[] = await knex(
      "transactions"
    ).where({
      user_id: userId,
    });

    const listUserTransactions = await Promise.all(
      userTransactions.map(async (transaction) => {
        const category: CategoryModel = await knex("categories")
          .where({ id: transaction.id })
          .first();

        const transactionWithCategoryName = {
          ...transaction,
          category_name: category.title,
        };

        return transactionWithCategoryName;
      })
    );

    return res.status(200).json(listUserTransactions);
  } catch (error: any) {
    return res
      .status(500)
      .json({ message: "Internal server error: " + error.message });
  }
};

export const createTransaction = async (req: MyReq, res: Response) => {
  const userId = req.userData?.id;

  try {
    const { description, value, type, date, category_id } =
      bodyNewTransaction.parse(req.body);

    if (type != "output" && type != "entry") {
      return res.status(400).json({ message: "Invalid transaction type" });
    }
    const authenticateCategory = await knex("categories")
      .where({
        id: category_id,
      })
      .first();

    if (!authenticateCategory) {
      return res
        .status(400)
        .json({ message: "The category specified not found" });
    }

    const newTransaction: TransactionModel[] = await knex("transactions")
      .insert({
        description,
        value,
        type,
        date,
        user_id: userId,
        category_id: authenticateCategory.id,
      })
      .returning("*");

    return res.status(201).json(newTransaction);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(500).json(error.errors);
    }
    return res.status(500).json({ message: "Internal server error: " + error });
  }
};