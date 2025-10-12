import React, { useState } from 'react';

// Types de modules
type ModuleType = 'Particuliers' | 'Professionnels' | 'Sportifs';

// Structure d'un module
interface Module {
  id: string;
  titre: string;
  description: string;
  icone: React.ComponentType<{ className?: string }>;
}

// Définition des modules
const modulesData: Record<ModuleType, Module[]> = {
  'Particuliers': [
    {
      id: 'adulte',
      titre: 'Module Adulte',
      description: 'Se connaitre',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'couple',
      titre: 'Module Couple',
      description: 'Se comprendre',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.796-.325-1.559-.676-2.395C7.885 8.507 7 6.352 7 4a3 3 0 016 0c0 1.052-.18 2.062-.506 3m-7.788 9.342C1.995 14.767 1 16.377 1 18c0 1.657 1.343 3 3 3s3-1.343 3-3-1.343-3-3-3-3 1.343-3 3zm12 0c0 1.657 1.343 3 3 3s3-1.343 3-3-1.343-3-3-3-3 1.343-3 3zm-7.5-5.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5 1.12 2.5 2.5 2.5c.276 0 .5.224.5.5v2c0 .276-.224.5-.5.5H4.5c-.276 0-.5-.224-.5-.5v-2c0-.276.224-.5.5-.5 1.38 0 2.5-1.12 2.5-2.5z" />
        </svg>
      )
    },
    {
      id: 'enfant',
      titre: 'Module Enfant',
      description: 'Activer son potentiel',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path d="M12 6v6l4 2" />
        </svg>
      )
    },
    {
      id: 'suivi-annuel',
      titre: 'Module Suivi Annuel',
      description: 'Climat',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 11.5a2.5 2.5 0 110-5A2.5 2.5 0 015 11.5zm14 0a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm-14 6a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm14 0a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
        </svg>
      )
    }
  ],
  'Professionnels': [
    {
      id: 'coequipiers',
      titre: 'Module Coéquipiers',
      description: 'S\'épanouir',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.768-.293-1.47-.765-2M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.768.293-1.47.765-2m0 0a3 3 0 114.468-2.813l1.706 1.058" />
        </svg>
      )
    },
    {
      id: 'equipe',
      titre: 'Module Équipe',
      description: 'S\'élever ensemble',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 13c-3.183 0-6.22-.62-9-1.745m0 0A23.98 23.98 0 0112 9.75c4.318 0 8.414.615 12 1.745m-12 0a23.685 23.685 0 01-3.255-1.745M21 13.255a23.707 23.707 0 01-3.255 1.745" />
        </svg>
      )
    },
    {
      id: 'candidat',
      titre: 'Module Candidat',
      description: 'Déceler le potentiel',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
        </svg>
      )
    },
    {
      id: 'associe',
      titre: 'Module Associé',
      description: 'Comment s\'alligner',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      )
    },
    {
      id: 'strategie',
      titre: 'Module Stratégie',
      description: 'Session Kairos',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    }
  ],
  'Sportifs': [
    {
      id: 'solo',
      titre: 'Module Solo',
      description: 'Se performer',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0H1m2 0h18m-18 0v-7a9 9 0 0118 0v7m-9-5h.01M12 12l.01-1M12 12l1-1m-1 1v-3" />
        </svg>
      )
    },
    {
      id: 'team',
      titre: 'Module Team',
      description: 'S\'unifier',
      icone: (props) => (
        <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
        </svg>
      )
    }
  ]
};

const ModulesPage: React.FC = () => {
  const [activeType, setActiveType] = useState<ModuleType>('Particuliers');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Nos Modules d'Accompagnement
      </h1>
      
      {/* Navigation des types de modules */}
      <div className="flex justify-center mb-8 space-x-4">
        {Object.keys(modulesData).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type as ModuleType)}
            className={`
              px-4 py-2 rounded-lg transition-colors 
              ${activeType === type 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }
            `}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Grille des modules */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modulesData[activeType].map((module) => (
          <div 
            key={module.id} 
            className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
          >
            <div className="p-6 flex flex-col items-center text-center">
              <module.icone
                className="w-16 h-16 text-blue-600 mb-4"
              />
              <h2 className="text-xl font-semibold mb-2">
                {module.titre}
              </h2>
              <p className="text-gray-600 italic">
                {module.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModulesPage;