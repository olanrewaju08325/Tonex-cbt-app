-- seed.sql

-- Insert 50 Universities
INSERT INTO public.universities (name, short_name) VALUES
    ('University of Lagos', 'UNILAG'),
    ('University of Ibadan', 'UI'),
    ('Obafemi Awolowo University', 'OAU'),
    ('University of Benin', 'UNIBEN'),
    ('Ahmadu Bello University', 'ABU'),
    ('University of Nigeria, Nsukka', 'UNN'),
    ('Nnamdi Azikiwe University', 'UNIZIK'),
    ('University of Port Harcourt', 'UNIPORT'),
    ('Federal University of Technology, Akure', 'FUTA'),
    ('Ladoke Akintola University of Technology', 'LAUTECH'),
    ('Babcock University', 'Babcock'),
    ('Covenant University', 'Covenant'),
    ('University of Ilorin', 'UNILORIN'),
    ('University of Abuja', 'UNIABUJA'),
    ('Federal University of Agriculture, Abeokuta', 'FUNAAB'),
    ('Lagos State University', 'LASU'),
    ('Federal University Oye-Ekiti', 'FUOYE'),
    ('Ekiti State University', 'EKSU'),
    ('Rivers State University', 'RSUST'),
    ('Abubakar Tafawa Balewa University', 'ATBU'),
    ('Modibbo Adama University of Technology', 'MAUTECH'),
    ('Federal University of Technology, Owerri', 'FUTO'),
    ('Imo State University', 'IMSU'),
    ('Ebonyi State University', 'EBSU'),
    ('Adekunle Ajasin University', 'AAUA'),
    ('Federal University of Agriculture, Makurdi', 'FUAM'),
    ('Michael Okpara University of Agriculture', 'MOUAU'),
    ('Chukwuemeka Odumegwu Ojukwu University', 'COOU'),
    ('Delta State University', 'DELSU'),
    ('Afe Babalola University', 'ABUAD'),
    ('Baze University', 'BAZE'),
    ('American University of Nigeria', 'AUN'),
    ('Caleb University', 'CALEB'),
    ('Bowen University', 'BOWEN'),
    ('Redeemer''s University', 'REDEEMER'),
    ('Madonna University', 'MADONNA'),
    ('Novena University', 'NOVENA'),
    ('Igbinedion University', 'IGBINEDION'),
    ('Ajayi Crowther University', 'AJAYI CROWTHER'),
    ('Paul University', 'PAUL UNIVERSITY'),
    ('Landmark University', 'LANDMARK'),
    ('Bells University of Technology', 'BELLS'),
    ('Crawford University', 'CRAWFORD'),
    ('Achievers University', 'ACHIEVERS'),
    ('Elizade University', 'ELIZADE'),
    ('Joseph Ayo Babalola University', 'JOSEPH AYE'),
    ('McPherson University', 'MCPHERSON'),
    ('Samuel Adegboyega University', 'SAMUEL ADEGBOYEGA'),
    ('Veritas University', 'VERITAS'),
    ('Western Delta University', 'WESTERN DELTA')
ON CONFLICT DO NOTHING;

-- Insert 12 Subjects
INSERT INTO public.subjects (name, slug) VALUES
    ('English Language', 'english'),
    ('Mathematics', 'mathematics'),
    ('Physics', 'physics'),
    ('Chemistry', 'chemistry'),
    ('Biology', 'biology'),
    ('Economics', 'economics'),
    ('Government', 'government'),
    ('Literature in English', 'literature'),
    ('Geography', 'geography'),
    ('History', 'history'),
    ('Commerce', 'commerce'),
    ('Financial Accounting', 'accounting')
ON CONFLICT DO NOTHING;

-- Insert 15 Mock Questions
DO $$
DECLARE
    uni_unilag uuid;
    uni_ui uuid;
    uni_oau uuid;
    uni_uniben uuid;
    uni_abu uuid;
    uni_unn uuid;
    uni_uniport uuid;

    sub_english uuid;
    sub_math uuid;
    sub_physics uuid;
    sub_chem uuid;
    sub_bio uuid;
    sub_econ uuid;
    sub_govt uuid;
BEGIN
    SELECT id INTO uni_unilag FROM universities WHERE short_name = 'UNILAG';
    SELECT id INTO uni_ui FROM universities WHERE short_name = 'UI';
    SELECT id INTO uni_oau FROM universities WHERE short_name = 'OAU';
    SELECT id INTO uni_uniben FROM universities WHERE short_name = 'UNIBEN';
    SELECT id INTO uni_abu FROM universities WHERE short_name = 'ABU';
    SELECT id INTO uni_unn FROM universities WHERE short_name = 'UNN';
    SELECT id INTO uni_uniport FROM universities WHERE short_name = 'UNIPORT';

    SELECT id INTO sub_english FROM subjects WHERE slug = 'english';
    SELECT id INTO sub_math FROM subjects WHERE slug = 'mathematics';
    SELECT id INTO sub_physics FROM subjects WHERE slug = 'physics';
    SELECT id INTO sub_chem FROM subjects WHERE slug = 'chemistry';
    SELECT id INTO sub_bio FROM subjects WHERE slug = 'biology';
    SELECT id INTO sub_econ FROM subjects WHERE slug = 'economics';
    SELECT id INTO sub_govt FROM subjects WHERE slug = 'government';

    INSERT INTO public.questions (university_id, subject_id, text, option_a, option_b, option_c, option_d, correct_answer, explanation, year, is_published) VALUES
    (uni_unilag, sub_english, 'Choose the word that is most nearly opposite in meaning to the word ZENITH.', 'Acme', 'Nadir', 'Pinnacle', 'Summit', 'B', 'ZENITH means the highest point. Its antonym (opposite) is NADIR, which means the lowest point. Acme, Pinnacle, and Summit are all synonyms of Zenith.', 2023, true),
    (uni_unilag, sub_english, 'Select the option that best fills the gap: The committee _____ been unable to reach a decision.', 'have', 'has', 'had been', 'were', 'B', '''Committee'' is a collective noun and takes a singular verb ''has'' in formal/standard English usage, especially in Nigerian English.', 2023, true),
    (uni_ui, sub_math, 'If log₂(x) = 3, find the value of x.', '6', '8', '9', '12', 'B', 'log₂(x) = 3 means 2³ = x. Therefore x = 2 × 2 × 2 = 8.', 2022, true),
    (uni_ui, sub_math, 'Find the value of x in the equation 3x² - 12 = 0.', 'x = ±2', 'x = ±4', 'x = ±3', 'x = ±6', 'A', '3x² - 12 = 0 → 3x² = 12 → x² = 4 → x = ±√4 = ±2.', 2022, true),
    (uni_oau, sub_physics, 'A body of mass 5 kg is acted upon by a force of 20 N. What is the acceleration of the body?', '2 m/s²', '4 m/s²', '5 m/s²', '100 m/s²', 'B', 'Using Newton''s second law: F = ma → a = F/m = 20/5 = 4 m/s².', 2023, true),
    (uni_oau, sub_physics, 'Which of the following is a vector quantity?', 'Mass', 'Temperature', 'Speed', 'Velocity', 'D', 'Velocity is a vector quantity because it has both magnitude and direction. Mass, temperature, and speed are scalar quantities.', 2022, true),
    (uni_uniben, sub_chem, 'What is the oxidation state of sulphur in H₂SO₄?', '+2', '+4', '+6', '+8', 'C', 'In H₂SO₄: 2(+1) + S + 4(-2) = 0 → 2 + S - 8 = 0 → S = +6.', 2023, true),
    (uni_abu, sub_bio, 'Which organelle is responsible for protein synthesis in a cell?', 'Mitochondria', 'Ribosome', 'Golgi apparatus', 'Lysosome', 'B', 'Ribosomes are the site of protein synthesis. They translate mRNA into amino acid chains that form proteins.', 2022, true),
    (uni_unilag, sub_econ, 'When supply increases and demand remains constant, the equilibrium price will:', 'Increase', 'Decrease', 'Remain constant', 'Cannot be determined', 'B', 'When supply increases and demand is constant, there is a surplus at the original price, causing sellers to lower prices until a new equilibrium is reached at a lower price.', 2023, true),
    (uni_ui, sub_govt, 'The principle of separation of powers was propounded by:', 'John Locke', 'Thomas Hobbes', 'Baron de Montesquieu', 'Jean-Jacques Rousseau', 'C', 'Baron de Montesquieu, a French political philosopher, propounded the doctrine of separation of powers in his book ''The Spirit of the Laws'' (1748).', 2022, true),
    (uni_oau, sub_math, 'Simplify: (2³ × 2⁴) ÷ 2⁵', '2', '4', '8', '16', 'B', '(2³ × 2⁴) ÷ 2⁵ = 2^(3+4-5) = 2² = 4.', 2023, true),
    (uni_oau, sub_english, 'Identify the figure of speech in: ''The sun smiled down on us.''', 'Metaphor', 'Simile', 'Personification', 'Hyperbole', 'C', 'Personification attributes human qualities (smiling) to non-human entities (the sun). It is different from simile (uses like/as) and metaphor (direct comparison).', 2022, true),
    (uni_unn, sub_physics, 'The unit of electric potential difference (voltage) is:', 'Ampere', 'Ohm', 'Watt', 'Volt', 'D', 'Electric potential difference is measured in Volts (V), named after Alessandro Volta. Ampere measures current, Ohm measures resistance, and Watt measures power.', 2023, true),
    (uni_uniport, sub_chem, 'Which of the following elements is a noble gas?', 'Fluorine', 'Nitrogen', 'Argon', 'Chlorine', 'C', 'Argon (Ar) is a noble gas in Group 18 of the periodic table. Noble gases are characterized by full valence electron shells and are generally unreactive.', 2022, true),
    (uni_abu, sub_bio, 'Which blood group is known as the universal donor?', 'AB+', 'A+', 'O-', 'B-', 'C', 'Blood group O- (O negative) is the universal donor because it lacks A, B, and Rh antigens, making it compatible with all blood groups in emergency transfusions.', 2023, true);
END $$;

-- Superadmin role setup (this will only affect the profile if the user has already registered in auth.users)
UPDATE public.profiles SET role = 'superadmin' WHERE email = 'obianombenedict@gmail.com';
