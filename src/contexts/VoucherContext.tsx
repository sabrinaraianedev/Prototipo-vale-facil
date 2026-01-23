import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

export type VoucherStatus = 'gerado' | 'utilizado' | 'cancelado';

export interface Voucher {
  id: string;
  code: string;
  value: number;
  voucherTypeId: string | null;
  vehiclePlate: string;
  driverName: string;
  liters: number;
  establishmentId: string;
  establishmentName: string;
  cashierId: string;
  cashierName: string;
  status: VoucherStatus;
  createdAt: Date;
  redeemedAt?: Date;
  redeemedBy?: string;
}

export interface VoucherTypeConfig {
  id: string;
  name: string;
  value: number;
  minLiters: number;
  active: boolean;
}

export interface Establishment {
  id: string;
  name: string;
  active: boolean;
}

interface VoucherContextType {
  vouchers: Voucher[];
  voucherTypes: VoucherTypeConfig[];
  establishments: Establishment[];
  loading: boolean;
  createVoucher: (voucher: {
    value: number;
    voucherTypeId: string;
    vehiclePlate: string;
    driverName: string;
    liters: number;
    establishmentId: string;
  }) => Promise<Voucher | null>;
  redeemVoucher: (code: string) => Promise<{ success: boolean; error?: string; voucher?: Voucher }>;
  getVoucherByCode: (code: string) => Promise<Voucher | null>;
  addVoucherType: (config: Omit<VoucherTypeConfig, 'id'>) => Promise<void>;
  updateVoucherType: (id: string, config: Partial<VoucherTypeConfig>) => Promise<void>;
  getEligibleVoucherType: (liters: number) => VoucherTypeConfig | null;
  refreshData: () => Promise<void>;
}

const VoucherContext = createContext<VoucherContextType | undefined>(undefined);

export function VoucherProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [voucherTypes, setVoucherTypes] = useState<VoucherTypeConfig[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  // Reset state when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setVouchers([]);
      setVoucherTypes([]);
      setEstablishments([]);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Fetch voucher types
      const { data: typesData, error: typesError } = await supabase
        .from('voucher_types')
        .select('*')
        .order('min_liters', { ascending: true });

      if (typesError) {
        console.error('Error fetching voucher types:', typesError);
      } else if (typesData) {
        setVoucherTypes(typesData.map(t => ({
          id: t.id,
          name: t.name,
          value: Number(t.value),
          minLiters: Number(t.min_liters),
          active: t.active,
        })));
      }

      // Fetch establishments
      const { data: estData, error: estError } = await supabase
        .from('establishments')
        .select('*')
        .eq('active', true);

      if (estError) {
        console.error('Error fetching establishments:', estError);
      } else if (estData) {
        setEstablishments(estData.map(e => ({
          id: e.id,
          name: e.name,
          active: e.active,
        })));
      }

      // Fetch vouchers and establishments separately to avoid join issues
      const { data: vouchersData, error: vouchersError } = await supabase
        .from('vouchers')
        .select('*')
        .order('created_at', { ascending: false });

      if (vouchersError) {
        console.error('Error fetching vouchers:', vouchersError);
      } else if (vouchersData) {
        // Get establishment names mapping
        const { data: allEstablishments } = await supabase
          .from('establishments')
          .select('id, name');
        
        const estMap = new Map((allEstablishments || []).map(e => [e.id, e.name]));

        // Get cashier names mapping
        const cashierIds = [...new Set(vouchersData.map(v => v.cashier_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', cashierIds);
        
        const profileMap = new Map((profilesData || []).map(p => [p.id, p.name]));

        setVouchers(vouchersData.map(v => ({
          id: v.id,
          code: v.code,
          value: Number(v.value),
          voucherTypeId: v.voucher_type_id,
          vehiclePlate: v.vehicle_plate,
          driverName: v.driver_name,
          liters: Number(v.liters),
          establishmentId: v.establishment_id,
          establishmentName: estMap.get(v.establishment_id) || '',
          cashierId: v.cashier_id,
          cashierName: profileMap.get(v.cashier_id) || '',
          status: v.status as VoucherStatus,
          createdAt: new Date(v.created_at),
          redeemedAt: v.redeemed_at ? new Date(v.redeemed_at) : undefined,
          redeemedBy: v.redeemed_by || undefined,
        })));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshData = async () => {
    await fetchData();
  };

  const getEligibleVoucherType = useCallback((liters: number): VoucherTypeConfig | null => {
    const activeTypes = voucherTypes.filter(t => t.active);
    // Find the highest tier the user qualifies for
    const eligible = activeTypes
      .filter(t => liters >= t.minLiters)
      .sort((a, b) => b.minLiters - a.minLiters);
    
    return eligible[0] || null;
  }, [voucherTypes]);

  const createVoucher = async (voucherData: {
    value: number;
    voucherTypeId: string;
    vehiclePlate: string;
    driverName: string;
    liters: number;
    establishmentId: string;
  }): Promise<Voucher | null> => {
    if (!user) return null;

    try {
      // Generate unique code
      const { data: codeData, error: codeError } = await supabase.rpc('generate_voucher_code');
      
      if (codeError) {
        console.error('Error generating code:', codeError);
      }
      
      const code = `VF-${codeData || Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const { data, error } = await supabase
        .from('vouchers')
        .insert({
          code,
          value: voucherData.value,
          voucher_type_id: voucherData.voucherTypeId,
          vehicle_plate: voucherData.vehiclePlate,
          driver_name: voucherData.driverName,
          liters: voucherData.liters,
          establishment_id: voucherData.establishmentId,
          cashier_id: user.id,
          status: 'gerado',
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating voucher:', error);
        throw error;
      }

      // Get establishment name
      const establishment = establishments.find(e => e.id === voucherData.establishmentId);

      const newVoucher: Voucher = {
        id: data.id,
        code: data.code,
        value: Number(data.value),
        voucherTypeId: data.voucher_type_id,
        vehiclePlate: data.vehicle_plate,
        driverName: data.driver_name,
        liters: Number(data.liters),
        establishmentId: data.establishment_id,
        establishmentName: establishment?.name || '',
        cashierId: data.cashier_id,
        cashierName: user.name,
        status: 'gerado',
        createdAt: new Date(data.created_at),
      };

      setVouchers(prev => [newVoucher, ...prev]);
      return newVoucher;
    } catch (error) {
      console.error('Error creating voucher:', error);
      return null;
    }
  };

  const redeemVoucher = async (code: string): Promise<{ success: boolean; error?: string; voucher?: Voucher }> => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };

    try {
      // Find voucher by code
      const { data: voucherData, error: findError } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (findError) {
        console.error('Error finding voucher:', findError);
        return { success: false, error: 'Erro ao buscar vale' };
      }

      if (!voucherData) {
        return { success: false, error: 'Vale não encontrado' };
      }

      if (voucherData.status === 'utilizado') {
        return { success: false, error: 'Este vale já foi utilizado' };
      }

      if (voucherData.status === 'cancelado') {
        return { success: false, error: 'Este vale foi cancelado' };
      }

      // Update voucher
      const { data: updatedData, error: updateError } = await supabase
        .from('vouchers')
        .update({
          status: 'utilizado',
          redeemed_at: new Date().toISOString(),
          redeemed_by: user.id,
        })
        .eq('id', voucherData.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Error updating voucher:', updateError);
        throw updateError;
      }

      // Get establishment name
      const establishment = establishments.find(e => e.id === updatedData.establishment_id);

      const updatedVoucher: Voucher = {
        id: updatedData.id,
        code: updatedData.code,
        value: Number(updatedData.value),
        voucherTypeId: updatedData.voucher_type_id,
        vehiclePlate: updatedData.vehicle_plate,
        driverName: updatedData.driver_name,
        liters: Number(updatedData.liters),
        establishmentId: updatedData.establishment_id,
        establishmentName: establishment?.name || '',
        cashierId: updatedData.cashier_id,
        cashierName: '',
        status: 'utilizado',
        createdAt: new Date(updatedData.created_at),
        redeemedAt: new Date(updatedData.redeemed_at!),
        redeemedBy: updatedData.redeemed_by!,
      };

      setVouchers(prev => prev.map(v => v.id === updatedVoucher.id ? updatedVoucher : v));
      
      return { success: true, voucher: updatedVoucher };
    } catch (error: any) {
      console.error('Error redeeming voucher:', error);
      return { success: false, error: error.message || 'Erro ao resgatar vale' };
    }
  };

  const getVoucherByCode = async (code: string): Promise<Voucher | null> => {
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase())
        .maybeSingle();

      if (error || !data) return null;

      // Get establishment name
      const establishment = establishments.find(e => e.id === data.establishment_id);

      return {
        id: data.id,
        code: data.code,
        value: Number(data.value),
        voucherTypeId: data.voucher_type_id,
        vehiclePlate: data.vehicle_plate,
        driverName: data.driver_name,
        liters: Number(data.liters),
        establishmentId: data.establishment_id,
        establishmentName: establishment?.name || '',
        cashierId: data.cashier_id,
        cashierName: '',
        status: data.status as VoucherStatus,
        createdAt: new Date(data.created_at),
        redeemedAt: data.redeemed_at ? new Date(data.redeemed_at) : undefined,
        redeemedBy: data.redeemed_by || undefined,
      };
    } catch (error) {
      console.error('Error fetching voucher:', error);
      return null;
    }
  };

  const addVoucherType = async (config: Omit<VoucherTypeConfig, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('voucher_types')
        .insert({
          name: config.name,
          value: config.value,
          min_liters: config.minLiters,
          active: config.active,
        })
        .select()
        .single();

      if (error) throw error;

      setVoucherTypes(prev => [...prev, {
        id: data.id,
        name: data.name,
        value: Number(data.value),
        minLiters: Number(data.min_liters),
        active: data.active,
      }]);
    } catch (error) {
      console.error('Error adding voucher type:', error);
      throw error;
    }
  };

  const updateVoucherType = async (id: string, config: Partial<VoucherTypeConfig>) => {
    try {
      const updateData: any = {};
      if (config.name !== undefined) updateData.name = config.name;
      if (config.value !== undefined) updateData.value = config.value;
      if (config.minLiters !== undefined) updateData.min_liters = config.minLiters;
      if (config.active !== undefined) updateData.active = config.active;

      const { error } = await supabase
        .from('voucher_types')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setVoucherTypes(prev => prev.map(t => 
        t.id === id ? { ...t, ...config } : t
      ));
    } catch (error) {
      console.error('Error updating voucher type:', error);
      throw error;
    }
  };

  return (
    <VoucherContext.Provider value={{
      vouchers,
      voucherTypes,
      establishments,
      loading,
      createVoucher,
      redeemVoucher,
      getVoucherByCode,
      addVoucherType,
      updateVoucherType,
      getEligibleVoucherType,
      refreshData,
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
