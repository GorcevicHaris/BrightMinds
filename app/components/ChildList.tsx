'use client';

import React from 'react';
import { Child } from '@/types';
import { ChildCard } from './children/ChildCard';

interface ChildListProps {
    children: Child[];
    onDelete?: (id: number) => void;
}

export const ChildList: React.FC<ChildListProps> = ({ children, onDelete }) => {
    if (children.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Nema dodane dece</p>
                <p className="text-gray-400 text-sm mt-2">
                    Kliknite na "Dodaj dete" da biste dodali prvo dete
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
                <ChildCard key={child.id} child={child} onDelete={onDelete} />
            ))}
        </div>
    );
};