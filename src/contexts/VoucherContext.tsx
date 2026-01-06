import React, { createContext, useContext, useState, ReactNode } from 'react';

export type VoucherStatus = 'gerado' | 'utilizado' | 'cancelado';
export type VoucherType = 'combustivel' | 'conveniencia' | 'churrascaria';

export interface Voucher {
  id: string;
  code: string;
  value: number;
  type: VoucherType;
  vehiclePlate: string;
  driverName: string;
  establishment: string;
  cashierId: string;
  cashierName: string;
  status: VoucherStatus;
  createdAt: Date;
  usedAt?: Date;
  usedBy?: string;
}

export interface VoucherTypeConfig {
  id: string;
  name: string;
  value: number;
  type: VoucherType;
  active: boolean;
}

interface VoucherContextType {
  vouchers: Voucher[];
  voucherTypes: VoucherTypeConfig[];
  createVoucher: (voucher: Omit<Voucher, 'id' | 'code' | 'status' | 'createdAt'>) => Voucher;
  redeemVoucher: (code: string, establishmentId: string) => { success: boolean; error?: string; voucher?: Voucher };
  getVoucherByCode: (code: string) => Voucher | undefined;
  getVouchersByCashier: (cashierId: string) => Voucher[];
  getVouchersByEstablishment: (establishment: string) => Voucher[];
  addVoucherType: (config: Omit<VoucherTypeConfig, 'id'>) => void;
  updateVoucherType: (id: string, config: Partial<VoucherTypeConfig>) => void;
}

const VoucherContext = createContext<VoucherContextType | undefined>(undefined);

// Generate a unique code
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VF-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Mock initial vouchers
const initialVouchers: Voucher[] = [
  {
    id: '1',
    code: 'VF-ABC12345',
    value: 50,
    type: 'conveniencia',
    vehiclePlate: 'ABC-1234',
    driverName: 'João Silva',
    establishment: 'Conveniência',
    cashierId: '2',
    cashierName: 'Caixa Principal',
    status: 'utilizado',
    createdAt: new Date(Date.now() - 86400000 * 2),
    usedAt: new Date(Date.now() - 86400000),
    usedBy: 'Conveniência Central'
  },
  {
    id: '2',
    code: 'VF-DEF67890',
    value: 100,
    type: 'combustivel',
    vehiclePlate: 'XYZ-5678',
    driverName: 'Maria Santos',
    establishment: 'Posto',
    cashierId: '2',
    cashierName: 'Caixa Principal',
    status: 'gerado',
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    id: '3',
    code: 'VF-GHI11223',
    value: 75,
    type: 'churrascaria',
    vehiclePlate: 'QWE-9012',
    driverName: 'Pedro Oliveira',
    establishment: 'Churrascaria',
    cashierId: '2',
    cashierName: 'Caixa Principal',
    status: 'gerado',
    createdAt: new Date(),
  },
];

const initialVoucherTypes: VoucherTypeConfig[] = [
  { id: '1', name: 'Vale Combustível R$50', value: 50, type: 'combustivel', active: true },
  { id: '2', name: 'Vale Combustível R$100', value: 100, type: 'combustivel', active: true },
  { id: '3', name: 'Vale Conveniência R$25', value: 25, type: 'conveniencia', active: true },
  { id: '4', name: 'Vale Conveniência R$50', value: 50, type: 'conveniencia', active: true },
  { id: '5', name: 'Vale Churrascaria R$75', value: 75, type: 'churrascaria', active: true },
];

export function VoucherProvider({ children }: { children: ReactNode }) {
  const [vouchers, setVouchers] = useState<Voucher[]>(initialVouchers);
  const [voucherTypes, setVoucherTypes] = useState<VoucherTypeConfig[]>(initialVoucherTypes);

  const createVoucher = (voucherData: Omit<Voucher, 'id' | 'code' | 'status' | 'createdAt'>): Voucher => {
    const newVoucher: Voucher = {
      ...voucherData,
      id: Date.now().toString(),
      code: generateCode(),
      status: 'gerado',
      createdAt: new Date(),
    };
    setVouchers(prev => [newVoucher, ...prev]);
    return newVoucher;
  };

  const redeemVoucher = (code: string, establishmentId: string): { success: boolean; error?: string; voucher?: Voucher } => {
    const voucher = vouchers.find(v => v.code === code);
    
    if (!voucher) {
      return { success: false, error: 'Vale não encontrado' };
    }
    
    if (voucher.status === 'utilizado') {
      return { success: false, error: 'Este vale já foi utilizado' };
    }
    
    if (voucher.status === 'cancelado') {
      return { success: false, error: 'Este vale foi cancelado' };
    }

    const updatedVoucher: Voucher = {
      ...voucher,
      status: 'utilizado',
      usedAt: new Date(),
      usedBy: establishmentId,
    };

    setVouchers(prev => prev.map(v => v.id === voucher.id ? updatedVoucher : v));
    
    return { success: true, voucher: updatedVoucher };
  };

  const getVoucherByCode = (code: string) => vouchers.find(v => v.code === code);

  const getVouchersByCashier = (cashierId: string) => vouchers.filter(v => v.cashierId === cashierId);

  const getVouchersByEstablishment = (establishment: string) => 
    vouchers.filter(v => v.establishment.toLowerCase() === establishment.toLowerCase() || v.usedBy?.toLowerCase() === establishment.toLowerCase());

  const addVoucherType = (config: Omit<VoucherTypeConfig, 'id'>) => {
    const newType: VoucherTypeConfig = {
      ...config,
      id: Date.now().toString(),
    };
    setVoucherTypes(prev => [...prev, newType]);
  };

  const updateVoucherType = (id: string, config: Partial<VoucherTypeConfig>) => {
    setVoucherTypes(prev => prev.map(t => t.id === id ? { ...t, ...config } : t));
  };

  return (
    <VoucherContext.Provider value={{
      vouchers,
      voucherTypes,
      createVoucher,
      redeemVoucher,
      getVoucherByCode,
      getVouchersByCashier,
      getVouchersByEstablishment,
      addVoucherType,
      updateVoucherType,
    }}>
      {children}
    </VoucherContext.Provider>
  );
}

export function useVouchers() {
  const context = useContext(VoucherContext);
  if (context === undefined) {
    throw new Error('useVouchers must be used within a VoucherProvider');
  }
  return context;
}
