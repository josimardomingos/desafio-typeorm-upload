import path from 'path';
import fs from 'fs';

import { getRepository, In } from 'typeorm';
import AppError from '../errors/AppError';
import CSV from '../libraries/CSV';

import uploadConfig from '../config/upload';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  filename: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<Transaction[]> {
    const csvFilename = path.join(uploadConfig.directory, filename);
    const csvFileExists = await fs.promises.stat(csvFilename);

    if (!csvFileExists) {
      throw new AppError('File not found.', 401);
    }

    const csvTransactions = await CSV.loadFromFile(csvFilename);
    await fs.promises.unlink(csvFilename);

    if (!csvTransactions) {
      throw new AppError('Can not import empty file.', 401);
    }

    const allCategories = csvTransactions
      .map(transaction => transaction[3])
      .filter((value, index, self) => self.indexOf(value) === index);

    const categoryRepository = getRepository(Category);
    const existentCategories = await categoryRepository.find({
      where: In(allCategories),
    });

    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoriesTitles = allCategories.filter(
      category => !existentCategoriesTitle.includes(category),
    );

    const newCategories = categoryRepository.create(
      addCategoriesTitles.map(title => ({
        title,
      })),
    );

    await categoryRepository.save(newCategories);

    const finalCategories = [...existentCategories, ...newCategories];

    const transactionRepository = getRepository(Transaction);

    const createdTransactions = transactionRepository.create(
      csvTransactions.map(transaction => ({
        title: transaction[0],
        type: transaction[1] === 'income' ? 'income' : 'outcome',
        value: Number(transaction[2]),
        category: finalCategories.find(
          category => category.title === transaction[3],
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
