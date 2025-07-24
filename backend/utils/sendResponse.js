const sendResponse = (res, statusCode, success, data = null, message = null) => {
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