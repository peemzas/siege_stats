import { prisma } from './prisma';

export async function getCharacterByNameAndServer(name: string, serverName: string) {
  return prisma.character.findUnique({
    where: {
      name,
      serverName,
    },
  });
}

export async function getCharactersByServer(serverName: string) {
  return prisma.character.findMany({
    where: {
      serverName,
    },
    orderBy: {
      name: 'asc',
    },
  });
}
