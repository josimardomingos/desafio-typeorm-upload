import csvParse from 'csv-parse';
import fs from 'fs';

import AppError from '../errors/AppError';

class CSV {
  public static async loadFromFile(filePath: string): Promise<string[]> {
    const csvFileExists = await fs.promises.stat(filePath);
    if (!csvFileExists) {
      throw new AppError('CSV file not found.', 401);
    }

    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const lines: Array<string> = [];

    parseCSV.on('data', line => {
      lines.push(line);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    return lines;
  }
}

export default CSV;
