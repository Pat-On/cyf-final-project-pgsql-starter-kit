import React, { useContext, useEffect } from "react";
import {Redirect, useHistory} from 'react-router-dom';
import OverviewProfileCard from '../components/OverviewProfileCard';
import ViewProfileDetail from '../components/ViewProfileDetail';
import Introducing from '../components/Introducing';
import { ProfileContext } from '../context/ProfileContext';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/Header';
import styled from 'styled-components';
import GitHubLogin from "react-github-login";
import {graduates, graduateProfile} from '../api/graduates'


const Home = () => {
	let history = useHistory();

	const { getAllProfiles, getProfile, clearProfile, allProfiles, profile, isLoading, error }= useContext(ProfileContext);
	const { checkGraduate, isAuthenticated, setIsAuth }= useContext(AuthContext);

	const onSuccess =  (response) =>{
		const accessCode = response.code;
		console.log('acces', accessCode)
	  fetch(`https://gd-auth-test.herokuapp.com/api/callback?code=${accessCode}`)
      .then(res => res.json())
      .then(data => {
		  const graduatesList = graduates()
		  if(data in graduatesList){
			  console.log('graduate', data, isAuthenticated, 'list', graduatesList[data])
			 if(graduatesList[data]){
				setIsAuth(data)
				history.push('/viewprofile')
				console.log('hasprofile', data, isAuthenticated)
			 } else{
				history.push('/createprofile')
				console.log('hasntprofile', data, isAuthenticated)
			 }
			
		  } else {
			history.push('/notfound')
		  }

			//checkGraduate(data) will be called here
	   })
	}
    const onFailure = response => console.error(response);  

	useEffect(getAllProfiles, []);

	// useEffect (()=>{
	// 	isAuthenticated?history.push('/createprofile'):<Redirect to='/'/>
	// },[isAuthenticated])

	return (
		<Screen>
			<Header nav='nav' />
			<GitHub clientId='d46845e5f1d464b34454' //this needs to change according to heroku app configs
			onSuccess={onSuccess}
			onFailure={onFailure}
			redirectUri={'https://gd-auth-test.herokuapp.com/createprofile'}
			/>
			<Introducing
				header = 'Lorem ipsum dolor sit amet'
				text = 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi'
		  />	
    		<Container>
				{isLoading ? <Text>Loading...</Text>
					: allProfiles && allProfiles.map(( profile, i ) => {
						return <OverviewProfileCard profile={ profile } getProfile={getProfile} key={ i } />;
					})}
				{error && <Text>{error}</Text>}
				{profile&&<ViewProfileDetail clearProfile={clearProfile} profile={profile} />}
			</Container>
		</Screen>
	)}

export default Home;

const GitHub = styled(GitHubLogin)`
	background-color:red;	
	color:green;
	width:300px;
	height:150px;			
`

const Screen =styled.div`
	display:flex;
	flex-direction:column;
	align-items:center;
`;

const Container = styled.div`
	display:flex;
	flex-wrap:wrap;
	justify-content:center;
	width:75%;
`;

const Text = styled.p`
	fontSize:20;
`;

