import React, { useEffect } from 'react';
import Socket from '../utils/Socket';

export type User = {
  id: string;
  score: number;
  username: string;
};

export type RoundScore = {
  userId: string;
  username: string;
  score: number;
};
export type RoundTime = {
  timeToComplete: number;
  startTime: number;
};

export interface GameContextProps {
  users: User[];
  setUsers: (users: User[]) => void;
  drawingPermission: boolean;
  setDrawingPermission: (drawingPermission: boolean) => void;
  isGameStarted: boolean;
  setIsGameStarted: (isGameStarted: boolean) => void;
  isWaitingForNextRd: boolean;
  setIsWaitingForNextRd: (isWaitingForNextRd: boolean) => void;
  roundTime: null | RoundTime;
  setRoundTime: (roundTime: null | RoundTime) => void;
  word: null | string;
  setWord: (word: null | string) => void;
  roundScores: RoundScore[];
  setRoundScores: (roundScores: RoundScore[]) => void;
  activeUserId: string | null;
  setActiveUserId: (activeUserId: string | null) => void;
}
export const GameContext = React.createContext<Partial<GameContextProps>>({});

interface GameProviderProps {
  username: string;
  exitGame: () => void;
}

const GameProvider: React.FC<GameProviderProps> = (props) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [drawingPermission, setDrawingPermission] = React.useState(false);
  const [isGameStarted, setIsGameStarted] = React.useState(false);
  const [isWaitingForNextRd, setIsWaitingForNextRd] = React.useState(false);
  const [roundTime, setRoundTime] = React.useState<null | RoundTime>(null);
  const [word, setWord] = React.useState<null | string>(null);
  const [roundScores, setRoundScores] = React.useState<RoundScore[]>([]);
  const [activeUserId, setActiveUserId] = React.useState<null | string>(null);
  const socket = Socket.getSocket();
  const endRound = (): void => {
    setDrawingPermission(false);
    setIsWaitingForNextRd(true);
    setRoundTime(null);
    setActiveUserId(null);
  };
  const endGame = (): void => {
    endRound();
    socket.disconnect();
    props.exitGame();
  };
  useEffect(() => {
    socket.on('gameStart', (): void => {
      setIsGameStarted(true);
    });
    socket.on('roundStart', (msg: any): void => {
      setActiveUserId(msg.socketId);
      if (msg.socketId === socket.id) {
        setDrawingPermission(true);
      } else {
        setDrawingPermission(false);
      }
      setIsWaitingForNextRd(false);
      setRoundTime({
        timeToComplete: msg.timeToComplete,
        startTime: msg.startTime,
      });
      setWord(msg.word);
    });
    socket.on('roundEnd', endRound);
    socket.on('gameEnd', endGame);
    socket.on('usersState', (users: User[]) => {
      setUsers(users);
    });
    socket.on('kickOut', () => {
      socket.disconnect();
      props.exitGame();
    });
  }, []);
  useEffect(() => {
    socket.on('userJoin', (user: User) => {
      setUsers([...users, user]);
    });
    socket.on('userLeave', (user: User) => {
      setUsers(users.filter((usr) => usr.id !== user.id));
    });
    socket.on('roundScores', (rdScores: Record<string, number>) => {
      const newUsers: User[] = [];
      const rdScoresCurr: RoundScore[] = [];
      for (const user of users) {
        rdScoresCurr.push({
          userId: user.id,
          score: rdScores[user.id],
          username: user.username,
        });
        const newUser = { ...user, score: user.score + rdScores[user.id] };
        newUsers.push(newUser);
      }
      setRoundScores(rdScoresCurr);
      setUsers(newUsers);
    });
    return () => {
      socket.removeEventListener('userJoin');
      socket.removeEventListener('userLeave');
      socket.removeEventListener('roundScores');
    };
  }, [users]);
  return (
    <GameContext.Provider
      value={{
        users,
        setUsers,
        drawingPermission,
        setDrawingPermission,
        isGameStarted,
        setIsGameStarted,
        isWaitingForNextRd,
        setIsWaitingForNextRd,
        roundTime,
        setRoundTime,
        word,
        setWord,
        roundScores,
        setRoundScores,
        activeUserId,
        setActiveUserId,
      }}
    >
      {props.children}
    </GameContext.Provider>
  );
};

export default GameProvider;