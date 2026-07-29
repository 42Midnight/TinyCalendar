import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { Category } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeFilter, setActiveFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await invoke<Category[]>('get_categories');
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadCategories().finally(() => setLoading(false));
  }, [loadCategories]);

  const toggleFilter = useCallback((categoryId: number | null) => {
    setActiveFilter((prev) => (prev === categoryId ? null : categoryId));
  }, []);

  const addCategory = useCallback(async (name: string, color: string) => {
    try {
      await invoke<Category>('create_category', { name, color });
      await loadCategories();
    } catch (err) { console.error('Failed to create category:', err); }
  }, [loadCategories]);

  const editCategory = useCallback(async (id: number, name: string, color: string) => {
    try {
      await invoke<Category>('update_category', { id, name, color });
      await loadCategories();
    } catch (err) { console.error('Failed to update category:', err); }
  }, [loadCategories]);

  const removeCategory = useCallback(async (id: number) => {
    try {
      await invoke('delete_category', { id });
      await loadCategories();
    } catch (err) { console.error('Failed to delete category:', err); }
  }, [loadCategories]);

  const reorderCategories = useCallback(async (orderedIds: number[]) => {
    try {
      await invoke('update_category_order', { orderedIds });
      await loadCategories();
    } catch (err) { console.error('Failed to reorder:', err); }
  }, [loadCategories]);

  return {
    categories, activeFilter, toggleFilter, loading,
    addCategory, editCategory, removeCategory, reorderCategories,
    refreshCategories: loadCategories,
  };
}
