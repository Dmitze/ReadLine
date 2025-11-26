"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomRating = exports.getRandomGenre = exports.getRandomAuthor = exports.DEMO_ADMINS = exports.DEMO_BOOKS = exports.DEMO_TAGS = void 0;
const genres_1 = require("../../constants/genres");
exports.DEMO_TAGS = [
    'Класика',
    'Українська',
    'Поезія',
    'Історія',
    'Філософія',
    'Пригоди',
    'Драма',
    'Романтика',
    'Біографія',
    'Детектив',
    'Фантастика',
    'Мемуари',
    'Новела',
    'Художня',
    'Природа',
];
const authors = [
    'Тарас Шевченко',
    'Михайло Коцюбинський',
    'Валеріян Підмогильний',
    'Іван Франко',
    'Леся Українка',
    'Василь Стефаник',
    'Максим Рильський',
    'Марія Матіос',
    'Ліна Костенко',
    'Вадим Денисенко',
    'Олег Золотарьов',
    'Антоніна Бандура',
];
exports.DEMO_BOOKS = [
    {
        title: 'Кобзар',
        author: 'Тарас Шевченко',
        genre: 'Класика',
        description: 'Збірка поезій, найвідомішої роботи класика української літератури',
        rating: 4.9,
    },
    {
        title: 'Тіні забутих предків',
        author: 'Михайло Коцюбинський',
        genre: 'Історична',
        description: 'Поетична повість про кохання і Карпати, філософський твір',
        rating: 4.8,
    },
    {
        title: 'Місто',
        author: 'Валеріян Підмогильський',
        genre: 'Драма',
        description: 'Роман про життя у великому місті та пошук себе',
        rating: 4.5,
    },
    {
        title: 'Захар Беркут',
        author: 'Іван Франко',
        genre: 'Пригоди',
        description: 'Історична повість про боротьбу з ордами, про мужність і честь',
        rating: 4.7,
    },
    {
        title: 'Лебедина смерть',
        author: 'Леся Українка',
        genre: 'Трилер',
        description: 'Драматична поема, глибокий психологічний аналіз',
        rating: 4.6,
    },
    {
        title: 'Новели Василя Стефаника',
        author: 'Василь Стефаник',
        genre: 'Художня',
        description: 'Збірка невеликих оповідань про селянське життя',
        rating: 4.4,
    },
    {
        title: 'Поезії',
        author: 'Максим Рильський',
        genre: 'Поезія',
        description: 'Вибрані поезії видатного українського поета',
        rating: 4.6,
    },
    {
        title: 'Сонячна машина',
        author: 'Марія Матіос',
        genre: 'Фантастика',
        description: 'Сучасна фантастична повість з елементами містики',
        rating: 4.3,
    },
    {
        title: 'Записки циніка',
        author: 'Ліна Костенко',
        genre: 'Сатира',
        description: 'Гострий соціальний коментар у формі записок',
        rating: 4.5,
    },
    {
        title: 'Дикі слові',
        author: 'Вадим Денисенко',
        genre: 'Романтика',
        description: 'Лірична проза про кохання та втрати',
        rating: 4.2,
    },
    {
        title: 'Чорний дім',
        author: 'Олег Золотарьов',
        genre: 'Детектив',
        description: 'Сучасний кримінальний роман із закрученим сюжетом',
        rating: 4.4,
    },
    {
        title: 'Волхви',
        author: 'Антоніна Бандура',
        genre: 'Фентезі',
        description: 'Фантастичний світ магії та древніх таємниць',
        rating: 4.5,
    },
    {
        title: 'Космічне мандрування',
        author: 'Тарас Шевченко',
        genre: 'Sci-Fi',
        description: 'Футуристична повість про путівництво до зірок',
        rating: 4.6,
    },
    {
        title: 'Містична ніч',
        author: 'Валеріян Підмогильський',
        genre: 'Містика',
        description: 'Оповідання про надприродні явища та древні легенди',
        rating: 4.3,
    },
    {
        title: 'Усередину тьми',
        author: 'Іван Франко',
        genre: 'Жахи',
        description: 'Психологічний гірор, дослідження людської ненависти',
        rating: 4.4,
    },
];
exports.DEMO_ADMINS = [
    { user_id: 906087418, username: 'dmitze' },
    { user_id: 547751718, username: 'admin2' },
];
const getRandomAuthor = () => {
    return authors[Math.floor(Math.random() * authors.length)];
};
exports.getRandomAuthor = getRandomAuthor;
const getRandomGenre = () => {
    return genres_1.ALL_GENRES[Math.floor(Math.random() * genres_1.ALL_GENRES.length)];
};
exports.getRandomGenre = getRandomGenre;
const getRandomRating = () => {
    return Math.round((Math.random() * 1.5 + 3.5) * 10) / 10;
};
exports.getRandomRating = getRandomRating;
//# sourceMappingURL=seedData.js.map