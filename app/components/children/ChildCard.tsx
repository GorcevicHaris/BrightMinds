'use client';

import React from 'react';
import { Child } from '@/types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import Link from 'next/link';

interface ChildCardProps {
    child: Child;
    onDelete?: (id: number) => void;
}

export const ChildCard: React.FC<ChildCardProps> = ({ child, onDelete }) => {
    const calculateAge = (dateOfBirth: string) => {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return age;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('sr-RS', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                    {child.profile_image ? (
                        <img
                            src={child.profile_image}
                            alt={`${child.first_name} ${child.last_name}`}
                            className="w-20 h-20 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-2xl font-bold text-blue-600">
                                {child.first_name[0]}{child.last_name[0]}
                            </span>
                        </div>
                    )}
                </div>

                {/* Child Info */}
                <div className="flex-grow">
                    <h3 className="text-xl font-semibold text-gray-900">
                        {child.first_name} {child.last_name}
                    </h3>

                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                            <span className="font-medium">Uzrast:</span> {calculateAge(child.date_of_birth)} godina
                        </p>
                        <p>
                            <span className="font-medium">Datum rođenja:</span> {formatDate(child.date_of_birth)}
                        </p>
                        {child.gender && (
                            <p>
                                <span className="font-medium">Pol:</span>{' '}
                                {child.gender === 'male' ? 'Muško' : child.gender === 'female' ? 'Žensko' : 'Ostalo'}
                            </p>
                        )}
                    </div>

                    {child.notes && (
                        <p className="mt-3 text-sm text-gray-700 line-clamp-2">
                            {child.notes}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="mt-4 flex gap-2 flex-wrap">
                        <Link href={`/children/${child.id}`}>
                            <Button variant="primary" size="sm">
                                Pogledaj profil
                            </Button>
                        </Link>
                        {/* 🔴 NOVO: Live Monitor dugme - koristi standardni secondary stil */}
                        <Link href={`/dashboard/monitor/${child.id}`}>
                            <Button variant="secondary" size="sm">
                                👁️ Live Monitor
                            </Button>
                        </Link>

                        <Link href={`/children/${child.id}/edit`}>
                            <Button variant="secondary" size="sm">
                                Izmeni
                            </Button>
                        </Link>

                        {onDelete && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                    if (confirm(`Da li ste sigurni da želite da obrišete ${child.first_name}?`)) {
                                        onDelete(child.id);
                                    }
                                }}
                            >
                                Obriši
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    );
};