export interface SharedExpense {
  id: number;
  creatorId: string;
  description: string;
  totalAmount: number;
  splitType: 'equal' | 'custom';
  createdAt: string;
  participants: {
    userId: string;
    shareAmount: number;
  }[];
}
