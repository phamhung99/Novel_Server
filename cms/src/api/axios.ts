import axios from 'axios';
import { SERVER_URL } from '../constants/app.constants';

export default axios.create({
    baseURL: SERVER_URL,
});

export const axiosPrivate = axios.create({
    baseURL: SERVER_URL,
    headers: { 'Content-Type': 'application/json' },
});
