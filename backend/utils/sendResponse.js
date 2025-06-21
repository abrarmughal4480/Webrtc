const sendResponse = (success, statusCode, message, res, data = null) => {
	const response = {
		success,
		message
	};
	
	if (data) {
		response.data = data;
	}
	
	res.status(statusCode).json(response);
}

export default sendResponse;