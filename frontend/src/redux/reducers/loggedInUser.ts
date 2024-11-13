import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {RootState} from '../store';

export const loggedInUser = createSlice({
  name: 'loggedInUser',
  initialState: {
    username: '',
    isLoggedIn: false,
  },
  reducers: {
    logIn: (state, action: PayloadAction<string>) => {
      state.username = action.payload;
      state.isLoggedIn = true;
    },
    logOut: state => {
      state.isLoggedIn = false;
      state.username = '';
    },
  },
});

export const {logIn, logOut} = loggedInUser.actions;

export const isLoggedIn = (state: RootState) => state.user.isLoggedIn;
export const loggedInUsername = (state: RootState) => state.user.username;

export default loggedInUser.reducer;
