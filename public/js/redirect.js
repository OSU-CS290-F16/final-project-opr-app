window.onload = () => {
	console.log("loaded");

	var submitBtn = document.getElementById("submit-btn");

	submitBtn.addEventListener('click', () => {
		var code = document.getElementById("ec-input").value;
		console.log(code)
		window.location.href = '/events/' + code;
	})
}