import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import TransactionsRepository from '../repositories/TransactionsRepository';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);

    // SE FOR SAIDA, VERIFICAR SE TEM SALDO
    if (type === 'outcome') {
      const balance = await transactionRepository.getBalance();

      if (balance.total < value) {
        throw new AppError(`Total balance is sold out`, 400);
      }
    }

    const categoryRepository = getRepository(Category);
    let categoryDB = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    if (!categoryDB) {
      categoryDB = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(categoryDB);
    }

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id: categoryDB.id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
