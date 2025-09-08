import { useState, useEffect, useCallback } from 'react';
import { candidatesService, CandidatesFilters } from '../services/candidatesService';
import { Candidate, PaginatedResponse } from '../types';

export interface UseCandidatesResult {
  candidates: Candidate[];
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  totalPages: number;
  refetch: () => Promise<void>;
  updateFilters: (filters: CandidatesFilters) => void;
  updateCandidateStatus: (candidateId: string, status: string) => Promise<void>;
  bulkUpdateStatus: (candidateIds: string[], status: string) => Promise<void>;
  deleteCandidate: (candidateId: string) => Promise<void>;
  bulkDeleteCandidates: (candidateIds: string[]) => Promise<void>;
}

export const useCandidates = (initialFilters: CandidatesFilters = {}): UseCandidatesResult => {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<CandidatesFilters>(initialFilters);

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: PaginatedResponse<Candidate> = await candidatesService.getCandidates(filters);
      
      setCandidates(response.data);
      setTotal(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch candidates');
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const updateFilters = useCallback((newFilters: CandidatesFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const updateCandidateStatus = useCallback(async (candidateId: string, status: string) => {
    try {
      await candidatesService.updateCandidateStatus(candidateId, status);
      
      // Update local state
      setCandidates(prev => 
        prev.map(candidate => 
          candidate.id === candidateId 
            ? { ...candidate, status: status as any }
            : candidate
        )
      );
    } catch (err: any) {
      throw new Error(err.message || 'Failed to update candidate status');
    }
  }, []);

  const bulkUpdateStatus = useCallback(async (candidateIds: string[], status: string) => {
    try {
      await candidatesService.bulkUpdateStatus(candidateIds, status);
      
      // Update local state
      setCandidates(prev => 
        prev.map(candidate => 
          candidateIds.includes(candidate.id)
            ? { ...candidate, status: status as any }
            : candidate
        )
      );
    } catch (err: any) {
      throw new Error(err.message || 'Failed to bulk update candidate statuses');
    }
  }, []);

  const deleteCandidate = useCallback(async (candidateId: string) => {
    try {
      await candidatesService.deleteCandidate(candidateId);
      
      // Remove from local state
      setCandidates(prev => prev.filter(candidate => candidate.id !== candidateId));
      setTotal(prev => prev - 1);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to delete candidate');
    }
  }, []);

  const bulkDeleteCandidates = useCallback(async (candidateIds: string[]) => {
    try {
      await candidatesService.bulkDeleteCandidates(candidateIds);
      
      // Remove from local state
      setCandidates(prev => prev.filter(candidate => !candidateIds.includes(candidate.id)));
      setTotal(prev => prev - candidateIds.length);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to bulk delete candidates');
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchCandidates();
  }, [fetchCandidates]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  return {
    candidates,
    loading,
    error,
    total,
    page,
    totalPages,
    refetch,
    updateFilters,
    updateCandidateStatus,
    bulkUpdateStatus,
    deleteCandidate,
    bulkDeleteCandidates,
  };
};