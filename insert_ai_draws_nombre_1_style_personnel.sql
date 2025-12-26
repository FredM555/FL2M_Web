-- Script pour insérer 8 nouveaux tirages pour le nombre 1 (générés par IA)
-- Style personnel avec utilisation de "Je" et ton incitatif
-- À exécuter dans Supabase Dashboard > SQL Editor

INSERT INTO daily_draws (type, nombre, titre, message, source) VALUES

-- Tirage 1
('quotidien', 1, 'Je prends l''initiative',
'Je m''autorise à être le premier à proposer, à faire le premier pas. J''arrête d''attendre que quelqu''un d''autre commence. C''est à moi de lancer le mouvement, et j''assume cette responsabilité.',
'ai_generated'),

-- Tirage 2
('quotidien', 1, 'Je me fais confiance',
'J''écoute mon intuition et je me fie à mon jugement. Je cesse de douter de mes capacités ou de chercher constamment l''approbation des autres. Ma voix intérieure est mon meilleur guide.',
'ai_generated'),

-- Tirage 3
('quotidien', 1, 'Je crée mon propre chemin',
'Je refuse de suivre aveuglément ce que font les autres. Je trace ma propre route, même si elle est différente. J''ose être original et je m''autorise à innover sans craindre le jugement.',
'ai_generated'),

-- Tirage 4
('quotidien', 1, 'Je m''engage pleinement',
'Je choisis une direction et je m''y tiens. J''arrête de papillonner entre plusieurs options. En me concentrant sur un seul objectif à la fois, j''avance plus vite et plus efficacement.',
'ai_generated'),

-- Tirage 5
('quotidien', 1, 'Je me libère des dépendances',
'Je prends conscience de ce qui me rend dépendant (personne, habitude, croyance) et je m''en détache progressivement. Je deviens mon propre pilier, je construis ma force intérieure pour ne plus avoir besoin de béquilles extérieures.',
'ai_generated'),

-- Tirage 6
('quotidien', 1, 'Je transforme mes idées en actes',
'J''arrête de rêver sans agir. Je choisis une seule idée et je passe à l''action concrète aujourd''hui. Même un petit geste compte, l''important est de commencer maintenant plutôt que demain.',
'ai_generated'),

-- Tirage 7
('quotidien', 1, 'Je cesse de me comparer',
'Je me concentre sur mon propre parcours au lieu de regarder ce que font les autres. Chacun avance à son rythme, sur son chemin. Je célèbre mes propres progrès et j''arrête de me dévaloriser en me comparant.',
'ai_generated'),

-- Tirage 8
('quotidien', 1, 'Je sors de ma zone de confort',
'J''ose faire quelque chose de nouveau qui me fait un peu peur. Je choisis consciemment de me confronter à l''inconnu pour grandir. C''est en sortant de mes habitudes que je découvre de nouvelles facettes de moi-même.',
'ai_generated');
